const assert = require('assert');
const { checkRateLimit } = require('../src/lib/rate-limit');

function run() {
  const key = 'test-admin-ip';
  // reset behavior: call checkRateLimit with small limit
  // first two calls should be ok
  let r1 = checkRateLimit(key, 2, 10000);
  assert.strictEqual(r1.ok, true);
  let r2 = checkRateLimit(key, 2, 10000);
  assert.strictEqual(r2.ok, true);
  // third call should be blocked
  let r3 = checkRateLimit(key, 2, 10000);
  assert.strictEqual(r3.ok, false);
  assert.ok(r3.retryAfterSec > 0, 'retryAfterSec should be set');

  console.log('rate-limit-admin tests passed');
}

try {
  run();
  process.exit(0);
} catch (err) {
  console.error('rate-limit-admin tests failed');
  console.error(err);
  process.exit(1);
}
