const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const sqlite3 = require('sqlite3');
const { initializeDatabase, openDatabase, all, close, exec } = require('../src/config/databaseLifecycle');
const execute = promisify(execFile);
const serverRoot = path.resolve(__dirname, '..');
async function sandbox(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'bb06-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}
async function cli(script, file, args = [], extra = {}) {
  try {
    const result = await execute(process.execPath, [path.join(serverRoot, 'scripts', script), ...args], {
      cwd: serverRoot, env: { ...process.env, BB_SQLITE_PATH: file, BB_DEMO_DATABASE: '', ...extra }, timeout: 15000
    });
    return { code: 0, text: result.stdout + result.stderr };
  } catch (error) { return { code: error.code, text: error.stdout + error.stderr }; }
}

test('BB-06 new database has complete schema, no demo accounts and valid integrity', async t => {
  const dir = await sandbox(t); const file = path.join(dir, 'new.sqlite');
  assert.equal((await cli('initDatabase.js', file)).code, 0);
  const db = await openDatabase(file, sqlite3.OPEN_READONLY);
  try {
    assert.deepEqual(await all(db, 'PRAGMA integrity_check'), [{ integrity_check: 'ok' }]);
    assert.equal((await all(db, 'SELECT count(*) n FROM users'))[0].n, 0);
    assert.equal((await all(db, 'SELECT count(*) n FROM products'))[0].n, 0);
    assert.equal((await all(db, "SELECT count(*) n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"))[0].n, 27);
  } finally { await close(db); }
});

test('BB-06 existing database and sidecars are preserved byte for byte', async t => {
  const dir = await sandbox(t); const file = path.join(dir, 'existing.sqlite');
  await initializeDatabase({ file });
  const db = await openDatabase(file, sqlite3.OPEN_READWRITE);
  await exec(db, "INSERT INTO users(name,email,password) VALUES('Demo','demo@example.test','synthetic')"); await close(db);
  await fs.writeFile(file + '-wal', 'synthetic sidecar');
  const before = await fs.readFile(file); const sidecar = await fs.readFile(file + '-wal');
  const result = await cli('initDatabase.js', file);
  assert.equal(result.code, 1); assert.match(result.text, /ya existe/);
  assert.deepEqual(await fs.readFile(file), before);
  assert.deepEqual(await fs.readFile(file + '-wal'), sidecar);
});

test('BB-06 rejects empty files, directories, force/reset flags and recreate-db', async t => {
  const dir = await sandbox(t); const file = path.join(dir, 'empty.sqlite'); await fs.writeFile(file, '');
  assert.equal((await cli('initDatabase.js', file)).code, 1);
  assert.equal((await cli('initDatabase.js', dir)).code, 1);
  for (const arg of ['--force', '--reset', '--overwrite']) {
    assert.equal((await cli('initDatabase.js', file, [arg])).code, 1);
    assert.equal((await fs.stat(file)).size, 0);
  }
  const result = await cli('recreateDatabase.js', file);
  assert.equal(result.code, 1); assert.match(result.text, /deshabilitado/);
  assert.equal((await fs.stat(file)).size, 0);
});

test('BB-06 concurrent initializers publish exactly one complete database', async t => {
  const dir = await sandbox(t); const file = path.join(dir, 'race.sqlite');
  const results = await Promise.all([cli('initDatabase.js', file), cli('initDatabase.js', file)]);
  assert.deepEqual(results.map(x => x.code).sort(), [0, 1]);
  const db = await openDatabase(file, sqlite3.OPEN_READONLY);
  try { assert.equal((await all(db, 'PRAGMA integrity_check'))[0].integrity_check, 'ok'); }
  finally { await close(db); }
  assert.deepEqual(await fs.readdir(dir), ['race.sqlite']);
});

test('BB-06 missing parent/schema and SQL errors leave no target or partial schema', async t => {
  const dir = await sandbox(t);
  await assert.rejects(initializeDatabase({ file: path.join(dir, 'missing', 'new.sqlite') }), { code: 'INITIALIZATION_FAILED' });
  const file = path.join(dir, 'new.sqlite');
  await assert.rejects(initializeDatabase({ file, schemaFile: path.join(dir, 'absent.sql') }), { code: 'SCHEMA_UNAVAILABLE' });
  const schemaFile = path.join(dir, 'invalid.sql'); await fs.writeFile(schemaFile, 'CREATE TABLE partial(id); INVALID SECRET_SQL_LITERAL;');
  await assert.rejects(initializeDatabase({ file, schemaFile }), error => {
    assert.equal(error.code, 'INITIALIZATION_FAILED'); assert.doesNotMatch(error.message, /SECRET_SQL_LITERAL/); return true;
  });
  assert.deepEqual(await fs.readdir(dir), ['invalid.sql']);
});

test('BB-06 setup errors do not expose environment secrets or sensitive paths', async t => {
  const dir = await sandbox(t); const marker = 'SECRET_DO_NOT_PRINT_7492';
  const result = await cli('initDatabase.js', path.join(dir, marker, 'missing.sqlite'), [], { JWT_SECRET: marker, EMAIL_PASS: marker });
  assert.equal(result.code, 1); assert.doesNotMatch(result.text, new RegExp(marker));
  assert.doesNotMatch(result.text, /at .*\.js|SQLITE_CANTOPEN/);
});

test('BB-06 demo seed is explicit, catalog-only and rejects populated databases', async t => {
  const dir = await sandbox(t); const file = path.join(dir, 'demo.sqlite'); await initializeDatabase({ file });
  assert.equal((await cli('seedDemo.js', file)).code, 1);
  assert.equal((await cli('seedDemo.js', file, [], { BB_DEMO_DATABASE: '1' })).code, 0);
  const db = await openDatabase(file, sqlite3.OPEN_READONLY);
  try {
    assert.equal((await all(db, 'SELECT count(*) n FROM products'))[0].n, 1);
    assert.equal((await all(db, 'SELECT count(*) n FROM users'))[0].n, 0);
    assert.equal((await all(db, 'SELECT quantity FROM stock'))[0].quantity, 10);
  } finally { await close(db); }
  const before = await fs.readFile(file);
  assert.equal((await cli('seedDemo.js', file, [], { BB_DEMO_DATABASE: '1' })).code, 1);
  assert.deepEqual(await fs.readFile(file), before);
});

test('BB-06 orphan SQLite sidecars block initialization without deleting or reusing them', async t => {
  const dir = await sandbox(t);
  for (const suffix of ['-wal', '-shm', '-journal']) {
    const file = path.join(dir, suffix.slice(1) + '.sqlite');
    await fs.writeFile(file + suffix, 'preserve orphan sidecar');
    const result = await cli('initDatabase.js', file);
    assert.equal(result.code, 1);
    assert.equal(await fs.readFile(file + suffix, 'utf8'), 'preserve orphan sidecar');
    assert.equal(await fs.stat(file).then(() => true).catch(() => false), false);
  }
});
