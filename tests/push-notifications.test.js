require('./helpers/register-paths.cjs');

const assert = require('assert');

// Mock storage
const mockDb = {
  users: []
};

// Mock Mongoose UserModel
const { UserModel } = require('../src/lib/user-model');
UserModel.create = async (doc) => {
  const newDoc = { _id: 'test-user-id', pushSubscription: null, ...doc };
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

async function run() {
  // 1. Test getVapidKeys
  const vapidMod = await import('../src/lib/vapid.ts');
  const getVapidKeys = vapidMod.getVapidKeys || vapidMod.default?.getVapidKeys;
  assert.ok(typeof getVapidKeys === 'function');
  
  const keys = getVapidKeys();
  assert.ok(keys.publicKey, 'Should return a public key');
  assert.ok(keys.privateKey, 'Should return a private key');
  
  // 2. Emulate subscribe API logic
  const email = 'notify-test@example.com';
  const user = await UserModel.create({ email });
  assert.strictEqual(user.pushSubscription, null);

  const sampleSubscription = {
    endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/gAAAAAB...',
    keys: {
      auth: 'authSecret123',
      p256dh: 'p256dhKey456'
    }
  };

  // Mock Subscribe route behavior
  const dbUser = await UserModel.findOne({ email });
  assert.ok(dbUser);
  dbUser.pushSubscription = sampleSubscription;
  await dbUser.save();

  const updatedUser = await UserModel.findOne({ email });
  assert.deepStrictEqual(updatedUser.pushSubscription, sampleSubscription);

  // Clear subscription (unsubscribe)
  updatedUser.pushSubscription = null;
  await updatedUser.save();

  const clearedUser = await UserModel.findOne({ email });
  assert.strictEqual(clearedUser.pushSubscription, null);

  console.log('push notifications integration logic tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
