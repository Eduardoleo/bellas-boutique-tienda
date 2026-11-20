const fs = require('node:fs/promises');
const path = require('node:path');
const sqlite3 = require('sqlite3');
const { serverRoot, databasePath, requireExistingDatabase, DatabaseSetupError } = require('./databasePaths');
const schemaPath = path.join(serverRoot, 'database', 'schema.sql');

function openDatabase(file, mode) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(file, mode, error => error ? reject(error) : resolve(db));
  });
}
const exec = (db, sql) => new Promise((resolve, reject) => db.exec(sql, error => error ? reject(error) : resolve()));
const all = (db, sql) => new Promise((resolve, reject) => db.all(sql, (error, rows) => error ? reject(error) : resolve(rows)));
const close = db => new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
const run = (db, sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, error => error ? reject(error) : resolve()));

async function assertNewDestination(file) {
  for (const candidate of [file, file + '-wal', file + '-shm', file + '-journal']) {
    try {
      await fs.lstat(candidate);
      throw new DatabaseSetupError('DATABASE_EXISTS', 'La base o un archivo auxiliar ya existe. No se sobrescribió ni se modificó; init-db solo admite destinos nuevos.');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}

async function initializeDatabase({ file = databasePath(), schemaFile = schemaPath } = {}) {
  let temporary;
  let db;
  try {
    await assertNewDestination(file);
    const parent = path.dirname(file);
    if (!(await fs.stat(parent)).isDirectory()) throw new Error('invalid parent');
    let schema;
    try { schema = await fs.readFile(schemaFile, 'utf8'); }
    catch { throw new DatabaseSetupError('SCHEMA_UNAVAILABLE', 'No se pudo leer el esquema server/database/schema.sql. Verifique la instalación.'); }
    temporary = await fs.mkdtemp(path.join(parent, '.bb-init-'));
    const stagedFile = path.join(temporary, 'new.sqlite');
    db = await openDatabase(stagedFile, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
    await exec(db, 'PRAGMA foreign_keys = ON; BEGIN IMMEDIATE;');
    await exec(db, schema);
    await exec(db, 'COMMIT;');
    await close(db);
    db = undefined;
    // Atomic no-clobber publication: link fails if any destination already exists,
    // including a file created by another initializer after the initial check.
    await assertNewDestination(file);
    try { await fs.link(stagedFile, file); }
    catch (error) {
      if (error.code === 'EEXIST') throw new DatabaseSetupError('DATABASE_EXISTS', 'La base ya existe. No se sobrescribió ni se modificó; init-db solo admite destinos nuevos.');
      throw error;
    }
  } catch (error) {
    if (db) { await exec(db, 'ROLLBACK;').catch(() => {}); await close(db).catch(() => {}); }
    if (error instanceof DatabaseSetupError) throw error;
    throw new DatabaseSetupError('INITIALIZATION_FAILED', 'No se pudo inicializar SQLite. Verifique la ruta, permisos, esquema y soporte de enlaces físicos; el destino no se sobrescribe.');
  } finally {
    // Only remove the private directory this invocation created, never the destination.
    if (temporary) await fs.rm(temporary, { recursive: true, force: true });
  }
}

async function seedDemo() {
  if (process.env.BB_DEMO_DATABASE !== '1' || !process.env.BB_SQLITE_PATH) {
    throw new DatabaseSetupError('DEMO_REQUIRED', 'seed-demo exige BB_DEMO_DATABASE=1 y BB_SQLITE_PATH explícita para una base demo vacía.');
  }
  const file = requireExistingDatabase();
  let db;
  try {
    db = await openDatabase(file, sqlite3.OPEN_READWRITE);
    await exec(db, 'PRAGMA foreign_keys = ON; BEGIN IMMEDIATE;');
    const tables = await all(db, "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    for (const { name } of tables) {
      const escaped = name.replaceAll('"', '""');
      const rows = await all(db, 'SELECT 1 FROM "' + escaped + '" LIMIT 1');
      if (rows.length) throw new DatabaseSetupError('DEMO_NOT_EMPTY', 'La base no está vacía. Los datos demo no se cargaron.');
    }
    // Minimal fictional catalog only: no legacy SQL seeds, accounts or passwords.
    await run(db, 'INSERT INTO categories (name, gender, display_order) VALUES (?, ?, ?)', ['Demo', 'mujer', 1]);
    await run(db, 'INSERT INTO products (name, price, category, gender) VALUES (?, ?, ?, ?)', ['Producto de demostración', 100, 'Demo', 'mujer']);
    await run(db, 'INSERT INTO stock (product_id, quantity) VALUES (last_insert_rowid(), ?)', [10]);
    await exec(db, 'COMMIT;');
  } catch (error) {
    if (db) await exec(db, 'ROLLBACK;').catch(() => {});
    if (error instanceof DatabaseSetupError) throw error;
    throw new DatabaseSetupError('DEMO_FAILED', 'No se pudieron cargar los datos demo. Verifique que la base esté inicializada y sea accesible.');
  } finally { if (db) await close(db); }
}

async function validateDatabase(db) {
  const schema = await fs.readFile(schemaPath, 'utf8');
  const expected = [...schema.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map(match => match[1]);
  const actual = new Set((await all(db, "SELECT name FROM sqlite_master WHERE type='table'")).map(row => row.name));
  if (!expected.length || expected.some(name => !actual.has(name))) throw new Error('missing schema');
  const columns = {
    users: ['id', 'email', 'password', 'rol', 'estado'],
    checkout_requests: ['user_id','idempotency_key','fingerprint_version','request_hash','state','purchase_id','response_status','response_json','created_at'],
    checkout_effects: ['purchase_id','save_method','shipment','invoice_files','shipping_email','invoice_email','metadata_json','updated_at'],
    salas_chat: ['sala_id', 'owner_id', 'created_at'],
    products: ['id', 'price', 'gender'],
    stock: ['product_id', 'quantity'],
    purchases: ['id', 'user_id', 'total_amount', 'status', 'shipping_address', 'shipping_notes'],
    invoices: ['user_id', 'consecutivo', 'pdf_path'],
    purchase_items: ['purchase_id', 'product_id', 'quantity', 'price']
  };
  for (const [table, required] of Object.entries(columns)) {
    const present = new Set((await all(db, 'PRAGMA table_info(' + table + ')')).map(row => row.name));
    if (required.some(name => !present.has(name))) throw new Error('missing columns');
  }
  const requestColumns=await all(db,'PRAGMA table_info(checkout_requests)');
  const effectColumns=await all(db,'PRAGMA table_info(checkout_effects)');
  if(requestColumns.find(c=>c.name==='user_id')?.pk!==1||requestColumns.find(c=>c.name==='idempotency_key')?.pk!==2||effectColumns.find(c=>c.name==='purchase_id')?.pk!==1)throw new Error('invalid checkout primary keys');
  const indexes=await all(db,'PRAGMA index_list(checkout_requests)');
  let uniquePurchase=false;
  for(const index of indexes.filter(i=>i.unique&&!i.partial)){
    const info=await all(db,"PRAGMA index_info('"+index.name.replaceAll("'","''")+"')");
    if(info.length===1&&info[0].name==='purchase_id')uniquePurchase=true;
  }
  if(!uniquePurchase)throw new Error('missing unique checkout purchase');
  for(const table of ['checkout_requests','checkout_effects']){
    const foreign=await all(db,'PRAGMA foreign_key_list('+table+')');
    if(!foreign.some(f=>f.from==='purchase_id'&&f.table==='purchases'&&f.to==='id'&&f.on_delete==='RESTRICT'))throw new Error('invalid checkout purchase relation');
  }
  const owner=await all(db,'PRAGMA foreign_key_list(checkout_requests)');
  if(!owner.some(f=>f.from==='user_id'&&f.table==='users'&&f.to==='id'))throw new Error('invalid checkout owner relation');

}

async function checkDatabase() {
  let db;
  try {
    db = await openDatabase(requireExistingDatabase(), sqlite3.OPEN_READONLY);
    await validateDatabase(db);
  } catch (error) {
    if (error instanceof DatabaseSetupError) throw error;
    throw new DatabaseSetupError('SCHEMA_INVALID', 'La base SQLite no contiene el esquema requerido o no es válida. Revise la configuración y las migraciones; no se modificó la base.');
  } finally { if (db) await close(db); }
}

module.exports = { initializeDatabase, seedDemo, schemaPath, openDatabase, exec, all, close, validateDatabase, checkDatabase };
