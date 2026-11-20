const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cors = require('cors');
const { parseOrigins, buildCorsOptions } = require('../src/config/corsOptions');

async function serve(t, value) {
  const app = express();
  app.use(cors(buildCorsOptions(value)));
  app.get('/ping', (req, res) => res.json({ ok: true }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}/ping`;
}

test('FRONTEND_URL admite varios orígenes y quita la barra final', () => {
  assert.deepEqual(parseOrigins('https://a.example.test/, https://b.example.test'), ['https://a.example.test', 'https://b.example.test']);
  assert.deepEqual(parseOrigins(''), ['http://localhost:5173', 'http://127.0.0.1:5173']);
});

test('CORS refleja solo un origen permitido, nunca *', async t => {
  const url = await serve(t, 'https://tienda.example.test');
  const ok = await fetch(url, { headers: { Origin: 'https://tienda.example.test' } });
  assert.equal(ok.headers.get('access-control-allow-origin'), 'https://tienda.example.test');
  assert.equal(ok.headers.get('access-control-allow-credentials'), 'true');

  const evil = await fetch(url, { headers: { Origin: 'https://atacante.example.test' } });
  assert.equal(evil.headers.get('access-control-allow-origin'), null);

  const preflight = await fetch(url, { method: 'OPTIONS', headers: { Origin: 'https://atacante.example.test', 'Access-Control-Request-Method': 'POST' } });
  assert.equal(preflight.headers.get('access-control-allow-origin'), null);
});
