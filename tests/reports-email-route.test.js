require('./helpers/register-paths.cjs');

const assert = require('assert');
const { createServer } = require('node:http');
const request = require('supertest');

async function run() {
  const mod = await import('../src/app/api/reports/[id]/email/route.ts');
  const POST = mod.POST || mod.default?.POST;

  const server = createServer(async (req, res) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      const requestUrl = new URL(req.url, 'http://127.0.0.1');
      const requestInit = {
        method: req.method,
        headers: req.headers,
      };

      if (body) {
        requestInit.body = body;
      }

      const reqInstance = new Request(`http://127.0.0.1${requestUrl.pathname}`, requestInit);
      const response = await POST(reqInstance, {
        params: Promise.resolve({ id: '507f1f77bcf86cd799439011' }),
      });

      res.statusCode = response.status;
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      res.end(await response.text());
    });
  });

  const agent = request(server);
  const res = await agent.post('/').send({ to: 'user@example.com' });

  assert.strictEqual(res.status, 501);
  assert.ok(res.body && typeof res.body === 'object');
  assert.strictEqual(res.body.success, false);
  assert.ok(typeof res.body.message === 'string');
  assert.match(res.body.message, /Email not configured/i);

  server.close();
  console.log('reports email route integration test passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
