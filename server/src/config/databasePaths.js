const fs = require('node:fs');
const path = require('node:path');
const serverRoot = path.resolve(__dirname, '../..');

class DatabaseSetupError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'DatabaseSetupError';
    this.code = code;
  }
}

function loadEnvironment() {
  // The isolated demo launcher supplies all configuration; never read project .env files.
  if (process.env.BB_DEMO_ISOLATED === '1') {
    if (process.env.BB_DEMO_DATABASE !== '1' || !process.env.BB_SQLITE_PATH || !path.isAbsolute(process.env.BB_SQLITE_PATH)) throw new DatabaseSetupError('DEMO_REQUIRED', 'Demo aislada requiere destino explícito.');
    return;
  }
  // Process environment wins; server/.env precedes the project-level .env.
  require('dotenv').config({ path: [path.join(serverRoot, '.env'), path.join(serverRoot, '..', '.env')] });
}

function databasePath() {
  const value = process.env.BB_SQLITE_PATH;
  if (value === undefined) return path.join(serverRoot, 'database.sqlite');
  if (!value.trim() || value.includes('\0') || value === ':memory:' || /^[a-z][a-z0-9+.-]*:/i.test(value) && !/^[a-z]:[\\/]/i.test(value)) {
    throw new DatabaseSetupError('INVALID_PATH', 'BB_SQLITE_PATH debe ser una ruta de archivo SQLite, no una URI ni una base en memoria.');
  }
  return path.resolve(serverRoot, value);
}

function requireExistingDatabase(file = databasePath()) {
  try {
    const stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('invalid file');
  } catch {
    throw new DatabaseSetupError('DATABASE_UNAVAILABLE', 'La base SQLite no existe o no es un archivo regular accesible. Configure BB_SQLITE_PATH y ejecute init-db solo para una base nueva.');
  }
  return file;
}

module.exports = { serverRoot, databasePath, loadEnvironment, requireExistingDatabase, DatabaseSetupError };
