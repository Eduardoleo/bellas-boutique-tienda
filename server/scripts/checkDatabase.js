const { loadEnvironment, DatabaseSetupError } = require('../src/config/databasePaths');
const { checkDatabase } = require('../src/config/databaseLifecycle');
async function main() {
  loadEnvironment();
  if (process.argv.length > 2) throw new DatabaseSetupError('UNSUPPORTED_OPERATION', 'check-db no admite argumentos. Configure BB_SQLITE_PATH por entorno.');
  await checkDatabase();
  console.log('Base SQLite existente y esquema requerido verificados (solo lectura).');
}
main().catch(error => {
  console.error(error instanceof DatabaseSetupError ? error.message : 'No se pudo verificar SQLite.');
  process.exitCode = 1;
});
