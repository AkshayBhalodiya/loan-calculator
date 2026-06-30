const assert = require('assert');

async function run() {
  const { backfillUserLocale } = await import('../src/lib/user-etl-pipeline.ts');

  const fakeUserModel = {
    countDocuments: async () => 2,
    updateMany: async (_query, update) => ({ modifiedCount: 2, update }),
  };

  const summary = await backfillUserLocale(fakeUserModel, 'en-US');

  assert.strictEqual(summary.field, 'locale');
  assert.strictEqual(summary.applied, 2);
  assert.strictEqual(summary.skipped, 0);
  assert.strictEqual(summary.defaultValue, 'en-US');

  console.log('user ETL pipeline tests passed');
}
