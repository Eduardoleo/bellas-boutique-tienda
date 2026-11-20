const fs=require('node:fs/promises'),path=require('node:path'),sqlite=require('sqlite3');
const {requireExistingDatabase}=require('../src/config/databasePaths');
const {openDatabase,close,validateDatabase}=require('../src/config/databaseLifecycle');
const {createDatabaseAccess}=require('../src/config/sqliteOperations');
const {logError}=require('../src/utils/safeLogger');
async function migrate(db){const sql=await fs.readFile(path.join(__dirname,'../database/checkout.sql'),'utf8');return createDatabaseAccess(db).withTransaction(async tx=>{for(const statement of sql.split(';').filter(s=>s.trim()))await tx.runQuery(statement);await validateDatabase(db);});}
async function main(){let db;try{if(!process.env.BB_SQLITE_PATH?.trim()||!process.argv.includes('--confirm-checkout'))throw new Error('Explicit destination and confirmation required');db=await openDatabase(requireExistingDatabase(),sqlite.OPEN_READWRITE);await migrate(db);console.log('Esquema de checkout actualizado; no se asignaron claves a compras históricas.');}catch(error){logError('checkout.migration.failure',error);console.error('Actualización de checkout no completada. Requiere destino explícito, respaldo y --confirm-checkout.');process.exitCode=1;}finally{if(db)try{await close(db);}catch(error){logError('checkout.migration.close',error);process.exitCode=1;}}}
if(require.main===module)main();module.exports={migrate};
