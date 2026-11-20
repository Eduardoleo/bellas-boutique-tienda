const sqlite3 = require('sqlite3');
const { loadEnvironment, requireExistingDatabase, DatabaseSetupError } = require('./databasePaths');
const { validateDatabase } = require('./databaseLifecycle');
loadEnvironment();
// init-db must complete separately before the application opens a connection.
const dbPath = requireExistingDatabase();
let db;
const ready = new Promise((resolve, reject) => {
  db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, async error => {
    if (error) {
      reject(new DatabaseSetupError('DATABASE_OPEN_FAILED', 'No se pudo abrir la base SQLite existente. Verifique permisos y configuración.'));
      return;
    }
    try {
      db.configure('busyTimeout', 2000);
      await validateDatabase(db);
      await new Promise((done, fail) => db.run('PRAGMA foreign_keys = ON', err => err ? fail(err) : done()));
      resolve();
    } catch {
      db.close(() => reject(new DatabaseSetupError('SCHEMA_INVALID', 'La base SQLite no contiene el esquema requerido o no es válida. No se modificó; revise la base y sus migraciones antes de arrancar.')));
    }
  });
});

const { createDatabaseAccess } = require('./sqliteOperations');
module.exports = { db, ready, ...createDatabaseAccess(db) };
