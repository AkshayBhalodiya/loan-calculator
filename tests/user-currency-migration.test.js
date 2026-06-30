const assert = require('assert');

async function run() {
  const mod = await import('../src/lib/user-currency-migration.ts');
  const backfillUserCurrencies = mod.backfillUserCurrencies || mod.default?.backfillUserCurrencies;

  const docs = [
    { _id: 1, email: 'a@example.com' },
    { _id: 2, email: 'b@example.com', currency: '' },
    { _id: 3, email: 'c@example.com', currency: 'EUR' },
  ];

  const fakeModel = {
    async countDocuments(filter) {
      return docs.filter((doc) => {
        if (filter?.$or) {
          return filter.$or.some((condition) => {
            if (condition.currency?.$exists === false) return !Object.prototype.hasOwnProperty.call(doc, 'currency');
            if (condition.currency === null) return doc.currency == null;
            if (condition.currency === '') return doc.currency === '';
            return false;
          });
        }
        return false;
      }).length;
    },
    async updateMany(filter, update) {
      const toUpdate = docs.filter((doc) => {
        if (filter?.$or) {
          return filter.$or.some((condition) => {
            if (condition.currency?.$exists === false) return !Object.prototype.hasOwnProperty.call(doc, 'currency');
            if (condition.currency === null) return doc.currency == null;
            if (condition.currency === '') return doc.currency === '';
            return false;
          });
        }
        return false;
      });

      for (const doc of toUpdate) {
        doc.currency = update.$set.currency;
      }

      return { matchedCount: toUpdate.length, modifiedCount: toUpdate.length };
    },
  };

  const first = await backfillUserCurrencies(fakeModel, 'USD');
  assert.strictEqual(first.applied, 2, 'First run should backfill missing currency values');
  assert.strictEqual(first.defaultCurrency, 'USD');
  assert.strictEqual(docs[0].currency, 'USD');
  assert.strictEqual(docs[1].currency, 'USD');

  const second = await backfillUserCurrencies(fakeModel, 'USD');
  assert.strictEqual(second.applied, 0, 'Second run should be idempotent and not change docs again');

  console.log('user currency migration tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
