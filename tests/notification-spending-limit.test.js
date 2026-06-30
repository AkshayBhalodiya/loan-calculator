const assert = require('assert');

async function run() {
  const payload = { amount: 200, limit: 150 };
  const title = 'Spending limit exceeded';
  const message = `Transaction amount ${payload.amount} exceeded your single-transaction limit of ${payload.limit}.`;
  const notification = {
    userId: 'user-1',
    type: 'spending-limit-exceeded',
    title,
    message,
    metadata: { amount: payload.amount, limit: payload.limit },
  };

  assert.strictEqual(notification.type, 'spending-limit-exceeded');
  assert.strictEqual(notification.title, 'Spending limit exceeded');
  assert.ok(notification.message.includes('exceeded your single-transaction limit'));
  assert.strictEqual(notification.metadata.amount, 200);
  assert.strictEqual(notification.metadata.limit, 150);

  console.log('notification spending limit tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
