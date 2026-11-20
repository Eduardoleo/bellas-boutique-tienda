const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { errorHandler, asyncRoute, validateBodyShape, HttpError, sendHttpError } = require('../src/utils/httpErrors');
const { requestContext, logError } = require('../src/utils/safeLogger');
// Isolated HTTP middleware fixture: session/user lookup is mocked; assertions retained.
const config=require.resolve('../src/config/db');require.cache[config]={id:config,filename:config,loaded:true,exports:{getOne:async()=>({id:1,rol:'Cliente',estado:'Activo',email:'fixture@example.test'})}};
const { authMiddleware, checkRole } = require('../src/middleware/authMiddleware');
const { rateLimiter } = require('../src/middleware/validationMiddleware');
const marker = 'PRIVATE_MARKER_SQL_PASSWORD_TOKEN';
function capture(t) {
  const entries = []; const oldError = console.error; const oldLog = console.log;
  console.error = (...args) => entries.push(args.join(' ')); console.log = (...args) => entries.push(args.join(' '));
  t.after(() => { console.error = oldError; console.log = oldLog; }); return entries;
}
async function serve(t, setup, limit = '10mb') {
  const app = express(); app.use(requestContext); app.use(express.json({ limit }));
  setup(app); app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return 'http://127.0.0.1:' + server.address().port;
}
function safe(value) { assert.doesNotMatch(typeof value === 'string' ? value : JSON.stringify(value), new RegExp(marker)); }

test('BB-10 SQL exceptions use a stable 500 and logs contain no SQL, stack, request, token or cookie', async t => {
  const logs = capture(t);
  const base = await serve(t, app => app.get('/sql', asyncRoute(async req => {
    const error = new Error(marker); error.code = 'SQLITE_ERROR'; error.status = 400;
    error.sql = 'SELECT ' + marker; error.password = marker; error.stack = marker;
    throw error;
  })));
  const response = await fetch(base + '/sql?token=' + marker, { headers: { cookie: 'session=' + marker, authorization: 'Bearer ' + marker, 'x-request-id': marker } });
  assert.equal(response.status, 500); const body = await response.json();
  assert.equal(body.message, 'Error interno del servidor'); assert.equal(body.code, 'INTERNAL_ERROR'); assert.ok(body.errorId); safe(body); safe(logs);
  assert.notEqual(response.headers.get('x-request-id'), marker);
  const entry = JSON.parse(logs[0]); assert.equal(entry.code, 'SQLITE_ERROR'); assert.equal(entry.errorId, body.errorId); assert.ok(entry.requestId);
  assert.deepEqual(Object.keys(entry).sort(), ['code','errorClass','errorId','event','level','requestId'].sort());
});

test('BB-10 asynchronous programming rejection is handled as 500, never successful', async t => {
  const logs = capture(t); const base = await serve(t, app => app.get('/failure', asyncRoute(async () => { await Promise.resolve(); throw new TypeError(marker); })));
  const response = await fetch(base + '/failure'); assert.equal(response.status, 500); assert.equal((await response.json()).success, false); safe(logs);
});

test('BB-10 malformed JSON and excessive bodies receive 400/413 without reflecting payload', async t => {
  const logs = capture(t); const base = await serve(t, app => app.post('/body', (req, res) => res.json({ success: true })), '60b');
  let response = await fetch(base + '/body', { method:'POST',headers:{'content-type':'application/json'},body:'{"password":"' + marker });
  assert.equal(response.status, 400); safe(await response.text());
  response = await fetch(base + '/body', { method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:marker.repeat(8)}) });
  assert.equal(response.status, 413); safe(await response.text()); safe(logs);
});

test('BB-10 invalid object shape and field types receive 400', async t => {
  const base = await serve(t, app => { app.use(validateBodyShape); app.post('/body', (req,res) => res.json({success:true})); });
  for (const body of [[], {password:{value:marker}}, {gender:1}, {phone:12345678}, {motivo:{value:marker}}, {quantity:{value:marker}}]) {
    const response = await fetch(base + '/body', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    assert.equal(response.status, 400); safe(await response.text());
  }
});

test('BB-10 sent headers are never followed by a second JSON response or default stack handler', t => {
  capture(t); let destroyed = false;
  const res = {headersSent:true,writableEnded:false,destroy(){destroyed=true},status(){throw new Error('second response')}};
  sendHttpError({}, res, new Error(marker)); assert.equal(destroyed, true);
  const ended = {...res,writableEnded:true,destroy(){throw new Error('already ended')}};
  sendHttpError({}, ended, new Error(marker));
});

test('BB-10 invalid, expired, future and malformed-claim tokens are 401; denied roles are 403', async t => {
  const logs = capture(t); const old = process.env.JWT_SECRET; process.env.JWT_SECRET = 'synthetic-test-key';
  t.after(() => old === undefined ? delete process.env.JWT_SECRET : process.env.JWT_SECRET = old);
  const base = await serve(t, app => app.get('/admin', authMiddleware, checkRole('Administrador'), (req,res) => res.json({success:true})));
  const claims = {userId:1,rol:'Cliente',sid:'11111111-1111-4111-8111-111111111111'};
  const tokens = [marker,jwt.sign(claims,process.env.JWT_SECRET,{expiresIn:-1}),jwt.sign(claims,process.env.JWT_SECRET,{notBefore:'1h'}),jwt.sign({rol:'Administrador'},process.env.JWT_SECRET)];
  for (const token of tokens) { const response = await fetch(base + '/admin',{headers:{authorization:'Bearer '+token}}); assert.equal(response.status,401); safe(await response.text()); }
  const response = await fetch(base + '/admin',{headers:{authorization:'Bearer '+jwt.sign(claims,process.env.JWT_SECRET)}});
  assert.equal(response.status,403); safe(await response.text()); safe(logs);
});

test('BB-10 missing JWT configuration is an internal error rather than an invalid user token', async t => {
  const logs = capture(t); const old = process.env.JWT_SECRET; delete process.env.JWT_SECRET;
  t.after(() => old === undefined ? delete process.env.JWT_SECRET : process.env.JWT_SECRET = old);
  const base = await serve(t, app => app.get('/private', authMiddleware, (req,res) => res.json({success:true})));
  const response = await fetch(base + '/private',{headers:{authorization:'Bearer '+marker}}); assert.equal(response.status,500); safe(await response.text()); safe(logs);
});

test('BB-10 rate-limit events contain neither IP nor email', t => {
  const logs = capture(t); const limiter = rateLimiter(1,60000); const req={ip:marker,body:{email:marker}};
  let status; const res={status(code){status=code;return this},json(){return this}};
  limiter(req,res,()=>{}); limiter(req,res,()=>{}); assert.equal(status,429); safe(logs);
});

test('BB-10 only typed business errors are exposed, arbitrary exception status/message are ignored', async t => {
  const logs = capture(t); const base = await serve(t, app => {
    app.get('/business', asyncRoute(async () => { throw new HttpError('EMAIL_EXISTS'); }));
    app.get('/untrusted', asyncRoute(async () => { const e=new Error('email ya esta registrado '+marker); e.status=409; throw e; }));
  });
  let response=await fetch(base+'/business'); assert.equal(response.status,409); assert.equal((await response.json()).code,'EMAIL_EXISTS');
  response=await fetch(base+'/untrusted'); assert.equal(response.status,500); safe(await response.text()); safe(logs);
});

test('BB-10 logger emits allow-listed metadata even when exception properties contain secrets', t => {
  const logs=capture(t); const e=new Error(marker); e.code=marker; e.name=marker; e.cause={password:marker};
  logError(marker,e,{body:{password:marker}}); safe(logs);
  assert.equal(JSON.parse(logs[0]).event,'backend.error'); assert.equal(JSON.parse(logs[0]).errorClass,'Error');
});
