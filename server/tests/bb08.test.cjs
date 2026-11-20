const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFile, spawn } = require('node:child_process');
const { promisify } = require('node:util');
const sqlite3 = require('sqlite3');
const { initializeDatabase, openDatabase, close, exec } = require('../src/config/databaseLifecycle');
const execute = promisify(execFile);
const serverRoot = path.resolve(__dirname, '..');
const projectRoot = path.dirname(serverRoot);
async function sandbox(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'bb08-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}
const env = file => ({ ...process.env, BB_SQLITE_PATH: file, BB_DEMO_DATABASE: '', PORT: '0', JWT_SECRET: 'synthetic-test-only', BB_CHECKOUT_HASH_SECRET:'synthetic-checkout-fingerprint-key-32', EMAIL_USER: '', EMAIL_PASS: '' });
async function command(script, file, cwd, args = []) {
  try {
    const result = await execute(process.execPath, [path.join(serverRoot, script), ...args], { cwd, env: env(file), timeout: 15000 });
    return { code: 0, text: result.stdout + result.stderr };
  } catch (error) { return { code: error.code, text: error.stdout + error.stderr }; }
}
async function launch(file, cwd) {
  const child = spawn(process.execPath, [path.join(serverRoot, 'server.js')], { cwd, env: env(file), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let text = '';
  const stop = () => new Promise(resolve => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve();
    child.once('exit', resolve); child.kill();
  });
  try {
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('startup timeout')), 10000);
      function consume(chunk) {
        text += chunk.toString(); const match = text.match(/API lista en puerto (\d+)/);
        if (match) { clearTimeout(timer); resolve(Number(match[1])); }
      }
      child.stdout.on('data', consume); child.stderr.on('data', consume);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', code => { clearTimeout(timer); reject(new Error('API did not start: ' + code + ' ' + text)); });
    });
    return { port, stop };
  } catch (error) { await stop(); throw error; }
}

test('BB-08 init, read-only check and real HTTP startup use the same relative path from three working directories', async t => {
  const dir = await sandbox(t);
  for (const [index, cwd] of [projectRoot, serverRoot, dir].entries()) {
    const file = path.join(dir, 'cwd-' + index + '.sqlite');
    const relative = path.relative(serverRoot, file);
    assert.equal((await command('scripts/initDatabase.js', relative, cwd)).code, 0);
    assert.equal((await command('scripts/checkDatabase.js', relative, cwd)).code, 0);
    const before = await fs.readFile(file);
    const api = await launch(relative, cwd);
    try {
      const health = await fetch('http://127.0.0.1:' + api.port + '/api/health', { signal: AbortSignal.timeout(5000) });
      assert.equal(health.status, 200); assert.equal((await health.json()).status, 'healthy');
      const catalog = await fetch('http://127.0.0.1:' + api.port + '/api/catalog/women', { signal: AbortSignal.timeout(5000) });
      assert.equal(catalog.status, 200);
    } finally { await api.stop(); }
    assert.deepEqual(await fs.readFile(file), before);
  }
  assert.deepEqual((await fs.readdir(dir)).sort(), ['cwd-0.sqlite', 'cwd-1.sqlite', 'cwd-2.sqlite']);
});

test('BB-08 API and check-db reject missing, empty, malformed and incomplete databases without creation or modification', async t => {
  const dir = await sandbox(t);
  const cases = ['missing.sqlite', 'empty.sqlite', 'invalid.sqlite', 'incomplete.sqlite'];
  await fs.writeFile(path.join(dir, 'empty.sqlite'), '');
  await fs.writeFile(path.join(dir, 'invalid.sqlite'), 'SECRET_INVALID_DATABASE');
  const partial = await openDatabase(path.join(dir, 'incomplete.sqlite'), sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
  await exec(partial, 'CREATE TABLE users(id)'); await close(partial);
  for (const name of cases) {
    const file = path.join(dir, name); const before = await fs.readFile(file).catch(() => null);
    for (const script of ['scripts/checkDatabase.js', 'server.js']) {
      const result = await command(script, file, dir);
      assert.equal(result.code, 1); assert.doesNotMatch(result.text, /API lista|SECRET_INVALID_DATABASE|SQLITE_NOTADB/);
      assert.match(result.text, /SQLite/);
      assert.deepEqual(await fs.readFile(file).catch(() => null), before);
    }
  }
});

test('BB-08 rejects memory/URI/blank settings with safe messages, not accidental files', async t => {
  const dir = await sandbox(t);
  for (const value of ['', ' ', ':memory:', 'file:SECRET_CONFIG_VALUE?mode=rwc']) {
    for (const script of ['scripts/initDatabase.js', 'scripts/checkDatabase.js', 'server.js']) {
      const result = await command(script, value, dir);
      assert.equal(result.code, 1); assert.doesNotMatch(result.text, /SECRET_CONFIG_VALUE|synthetic-test-only/);
    }
  }
  assert.deepEqual(await fs.readdir(dir), []);
});

test('BB-08 missing maintenance target cannot create a database or fall back to the default', async t => {
  const dir = await sandbox(t); const file = path.join(dir, 'absent.sqlite');
  for (const script of ['scripts/checkFaqTables.js', 'scripts/addShippingColumns.js']) {
    const result = await command(script, file, dir);
    assert.equal(result.code, 1);
    assert.match(result.text, /no existe/);
  }
  assert.deepEqual(await fs.readdir(dir), []);
});

test('BB-08 legacy migration remains additive, is separate from initialization and reports errors as nonzero', async t => {
  const dir = await sandbox(t); const file = path.join(dir, 'legacy.sqlite');
  const db = await openDatabase(file, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
  await exec(db, "CREATE TABLE purchases(id INTEGER PRIMARY KEY, marker TEXT); INSERT INTO purchases VALUES (1,'preserved')"); await close(db);
  assert.equal((await command('scripts/addShippingColumns.js', file, dir)).code, 0);
  const migrated = await openDatabase(file, sqlite3.OPEN_READONLY);
  const rows = await new Promise((resolve, reject) => migrated.all('SELECT * FROM purchases', (e, r) => e ? reject(e) : resolve(r)));
  assert.deepEqual(rows, [{ id: 1, marker: 'preserved', shipping_address: null, shipping_notes: null }]); await close(migrated);
  const bad = path.join(dir, 'bad.sqlite'); await fs.writeFile(bad, 'SECRET_SQLITE_FAILURE');
  const result = await command('scripts/addShippingColumns.js', bad, dir);
  assert.equal(result.code, 1); assert.doesNotMatch(result.text, /SECRET_SQLITE_FAILURE/);
});

test('BB-08 process environment overrides fixed project .env files independently of cwd', async t => {
  const dir = await sandbox(t); const file = path.join(dir, 'env.sqlite'); await initializeDatabase({ file });
  // A cwd-local .env must never control the application; fixed server/project files are the only sources.
  await fs.writeFile(path.join(dir, '.env'), 'BB_SQLITE_PATH=SECRET_WRONG_TARGET.sqlite\nJWT_SECRET=SECRET_FROM_CWD\n');
  const result = await command('scripts/checkDatabase.js', file, dir);
  assert.equal(result.code, 0); assert.doesNotMatch(result.text, /SECRET_WRONG_TARGET|SECRET_FROM_CWD/);
  assert.deepEqual((await fs.readdir(dir)).sort(), ['.env', 'env.sqlite']);
});

test('BB-08 fixed .env precedence is process, server then project, with cwd ignored', async t => {
  const dir = await sandbox(t);
  const fixtureRoot = path.join(dir, 'fixture');
  const config = path.join(fixtureRoot, 'server', 'src', 'config');
  await fs.mkdir(config, { recursive: true });
  await fs.copyFile(path.join(serverRoot, 'src/config/databasePaths.js'), path.join(config, 'databasePaths.js'));
  await fs.symlink(path.join(serverRoot, 'node_modules'), path.join(fixtureRoot, 'server', 'node_modules'), 'junction');
  await fs.writeFile(path.join(fixtureRoot, '.env'), 'BB_SQLITE_PATH=project.sqlite\n');
  const serverEnv = path.join(fixtureRoot, 'server', '.env');
  await fs.writeFile(serverEnv, 'BB_SQLITE_PATH=server.sqlite\n');
  const code = 'const c=require(' + JSON.stringify(path.join(config, 'databasePaths.js')) + '); c.loadEnvironment(); console.log(c.databasePath());';
  const inherited = { ...process.env }; delete inherited.BB_SQLITE_PATH;
  const get = async variables => (await execute(process.execPath, ['-e', code], { cwd: dir, env: variables, timeout: 10000 })).stdout.trim();
  assert.equal(await get(inherited), path.join(fixtureRoot, 'server', 'server.sqlite'));
  assert.equal(await get({ ...inherited, BB_SQLITE_PATH: 'process.sqlite' }), path.join(fixtureRoot, 'server', 'process.sqlite'));
  await fs.unlink(serverEnv);
  assert.equal(await get(inherited), path.join(fixtureRoot, 'server', 'project.sqlite'));
});
