const assert = require('assert');
const { authorizeAdminToken } = require('../src/lib/authorize-admin');

function run() {
  // case: no token
  let res = authorizeAdminToken(undefined);
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.status, 401);

  // case: non-admin
  res = authorizeAdminToken({ role: 'user' });
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.status, 403);

  // case: admin
  res = authorizeAdminToken({ role: 'admin' });
  assert.strictEqual(res.ok, true);

  console.log('authorize-admin tests passed');
}

try {
  run();
  process.exit(0);
} catch (err) {
  console.error('authorize-admin tests failed');
  console.error(err);
  process.exit(1);
}
