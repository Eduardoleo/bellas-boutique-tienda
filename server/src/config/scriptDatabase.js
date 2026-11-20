const sqlite3 = require('sqlite3');
const { loadEnvironment, requireExistingDatabase, DatabaseSetupError } = require('./databasePaths');

// Legacy maintenance scripts may operate only on an explicitly existing file.
// READWRITE deliberately excludes OPEN_CREATE, so a racing deletion cannot create a new DB.
function openScriptDatabase(callback, { readOnly = false } = {}) {
  loadEnvironment();
  const file = requireExistingDatabase();
  const db = new sqlite3.Database(file, readOnly ? sqlite3.OPEN_READONLY : sqlite3.OPEN_READWRITE, error => {
    if (error) {
      const safe = new DatabaseSetupError('DATABASE_OPEN_FAILED', 'No se pudo abrir la base SQLite existente. Verifique permisos y configuración.');
      process.exitCode = 1;
      if (callback) callback(safe);
      else console.error(safe.message);
      return;
    }
    if (callback) callback(null);
  });
  return db;
}
module.exports = { openScriptDatabase };
