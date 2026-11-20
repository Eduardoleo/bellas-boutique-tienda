const { loadEnvironment, DatabaseSetupError } = require('../src/config/databasePaths');
const { seedDemo } = require('../src/config/databaseLifecycle');
async function main() {
  loadEnvironment();
  if (process.argv.length > 2) throw new DatabaseSetupError('UNSUPPORTED_OPERATION', 'seed-demo no admite argumentos ni operaciones de reset.');
  await seedDemo();
  console.log('Catálogo ficticio cargado. No se crearon cuentas ni credenciales.');
}
main().catch(error => {
  console.error(error instanceof DatabaseSetupError ? error.message : 'No se pudieron cargar los datos demo.');
  process.exitCode = 1;
});
