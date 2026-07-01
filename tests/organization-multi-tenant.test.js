require('./helpers/register-paths.cjs');

const assert = require('assert');
const { UserModel } = require('../src/lib/user-model');
const { ReportModel } = require('../src/lib/report-model');
const { OrganizationModel } = require('../src/lib/organization-model');

// Mock storage
const mockDb = {
  users: [],
  organizations: [],
  reports: []
};

// Stub UserModel
UserModel.create = async (doc) => {
  const newDoc = {
    _id: `user-id-${Date.now()}-${Math.random()}`,
    orgId: null,
    ...doc,
    async save() {
      const idx = mockDb.users.findIndex(u => String(u._id) === String(this._id));
      if (idx !== -1) {
        mockDb.users[idx] = this;
      }
      return this;
    }
  };
  mockDb.users.push(newDoc);
  return newDoc;
};

UserModel.findOne = async (query) => {
  if (query.email) {
    const u = mockDb.users.find(u => u.email === query.email);
    if (!u) return null;
    return {
      ...u,
      async save() {
        const idx = mockDb.users.findIndex(item => String(item._id) === String(this._id));
        if (idx !== -1) {
          mockDb.users[idx] = this;
        }
        return this;
      }
    };
  }
  return null;
};

// Stub OrganizationModel
OrganizationModel.create = async (doc) => {
  const newDoc = { _id: `org-id-${Date.now()}`, ...doc };
  mockDb.organizations.push(newDoc);
  return newDoc;
};

OrganizationModel.findOne = async (query) => {
  if (query.inviteCode) {
    return mockDb.organizations.find(o => o.inviteCode === query.inviteCode) || null;
  }
  return null;
};

OrganizationModel.findById = async (id) => {
  return mockDb.organizations.find(o => String(o._id) === String(id)) || null;
};

// Stub ReportModel
ReportModel.create = async (doc) => {
  const newDoc = { _id: `report-id-${Date.now()}`, ...doc };
  mockDb.reports.push(newDoc);
  return newDoc;
};

ReportModel.find = async (query) => {
  return mockDb.reports.filter(r => {
    if (query.orgId) {
      return r.orgId && String(r.orgId) === String(query.orgId);
    }
    if (query.userId) {
      return r.userId === query.userId;
    }
    return true;
  });
};

ReportModel.findById = async (id) => {
  const r = mockDb.reports.find(r => String(r._id) === String(id));
  if (!r) return null;
  return {
    ...r,
    toObject() {
      return this;
    }
  };
};

async function run() {
  const emailA = 'user-a@example.com';
  const emailB = 'user-b@example.com';
  const emailC = 'user-c@example.com';

  const userA = await UserModel.create({ email: emailA, name: 'User A' });
  const userB = await UserModel.create({ email: emailB, name: 'User B' });
  const userC = await UserModel.create({ email: emailC, name: 'User C' });

  assert.strictEqual(userA.orgId, null);

  // 1. Create organization
  const org = await OrganizationModel.create({
    name: 'Acme Corp',
    inviteCode: 'ACME12',
    createdBy: emailA
  });

  userA.orgId = org._id;
  await userA.save();

  const dbUserA = await UserModel.findOne({ email: emailA });
  assert.strictEqual(String(dbUserA.orgId), String(org._id));

  // 2. User B joins using inviteCode
  const foundOrg = await OrganizationModel.findOne({ inviteCode: 'ACME12' });
  assert.ok(foundOrg);
  userB.orgId = foundOrg._id;
  await userB.save();

  const dbUserB = await UserModel.findOne({ email: emailB });
  assert.strictEqual(String(dbUserB.orgId), String(org._id));

  // 3. User C remains isolated
  const dbUserC = await UserModel.findOne({ email: emailC });
  assert.strictEqual(dbUserC.orgId, null);

  // 4. Create a report belonging to User A's organization
  const report = await ReportModel.create({
    userId: emailA,
    orgId: org._id,
    title: 'Shared Prepayment Report',
    loan: { loanType: 'Home' }
  });

  // 5. Test reportOwnerFilter query logic from source
  const modReport = await import('../src/lib/report-model.ts');
  const reportOwnerFilter = modReport.reportOwnerFilter || modReport.default?.reportOwnerFilter;

  // User A (in org) -> filters by orgId
  const filterA = reportOwnerFilter(emailA, org._id);
  const reportsA = await ReportModel.find(filterA);
  assert.strictEqual(reportsA.length, 1);
  assert.strictEqual(reportsA[0].title, 'Shared Prepayment Report');

  // User B (in org) -> filters by orgId
  const filterB = reportOwnerFilter(emailB, org._id);
  const reportsB = await ReportModel.find(filterB);
  assert.strictEqual(reportsB.length, 1);
  assert.strictEqual(reportsB[0].title, 'Shared Prepayment Report');

  // User C (not in org) -> filters by userId
  const filterC = reportOwnerFilter(emailC, null);
  const reportsC = await ReportModel.find(filterC);
  assert.strictEqual(reportsC.length, 0);

  // 6. Test findOwnedReport logic from source
  const mod = await import('../src/app/api/reports/[id]/route.ts');
  const findOwnedReport = mod.findOwnedReport || mod.default?.findOwnedReport;

  // User A can access
  const accessA = await findOwnedReport(report._id, emailA, org._id, 'user');
  assert.ok(accessA.report);
  assert.strictEqual(accessA.forbidden, false);

  // User B can access
  const accessB = await findOwnedReport(report._id, emailB, org._id, 'user');
  assert.ok(accessB.report);
  assert.strictEqual(accessB.forbidden, false);

  // User C is forbidden
  const accessC = await findOwnedReport(report._id, emailC, null, 'user');
  assert.strictEqual(accessC.report, null);
  assert.strictEqual(accessC.forbidden, true);

  console.log('multi-tenant organization integration tests passed');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
