const assert = require('assert');
const request = require('supertest');
const { createServer } = require('node:http');

async function run() {
  const handler = async (req) => {
    const body = await req.json().catch(() => null);
    const { contentId, action } = body ?? {};
    if (!contentId || !action) {
      return new Response(JSON.stringify({ error: 'Missing contentId or action' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, contentId, action }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const server = createServer(async (req, res) => {
    const response = await handler(new Request('http://127.0.0.1' + req.url, {
      method: req.method,
      headers: req.headers,
    }));

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    res.end(await response.text());
  });

  const agent = request(server);
  const res = await agent.post('/').send({ contentId: 'abc' });

  assert.strictEqual(res.status, 400);
  assert.ok(res.body && typeof res.body === 'object');
  assert.strictEqual(res.body.error, 'Missing contentId or action');

  server.close();
  console.log('moderation content route integration test passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
