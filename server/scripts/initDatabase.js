const { loadEnvironment, DatabaseSetupError } = require('../src/config/databasePaths');
const { initializeDatabase } = require('../src/config/databaseLifecycle');

async function main() {
  loadEnvironment();
  if (process.argv.length > 2) throw new DatabaseSetupError('UNSUPPORTED_OPERATION', 'init-db no admite force, reset, sobrescritura ni argumentos adicionales.');
  await initializeDatabase();
  console.log('Base nueva inicializada: solo esquema, sin cuentas ni datos demo.');
}

main().catch(error => {
  console.error(error instanceof DatabaseSetupError ? error.message : 'No se pudo inicializar SQLite. Verifique la configuración.');
  process.exitCode = 1;
});
