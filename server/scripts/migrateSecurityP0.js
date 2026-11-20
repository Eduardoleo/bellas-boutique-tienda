const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const sqlite=require('sqlite3');
const {requireExistingDatabase}=require('../src/config/databasePaths');
const {openDatabase,close}=require('../src/config/databaseLifecycle');
const {createDatabaseAccess}=require('../src/config/sqliteOperations');
const {logError}=require('../src/utils/safeLogger');
async function migrate(db){
 const sql=await fs.readFile(path.join(__dirname,'../database/security-p0.sql'),'utf8');
 return createDatabaseAccess(db).withTransaction(async tx=>{
  await tx.runQuery(sql);
  await tx.runQuery('INSERT OR IGNORE INTO salas_chat(sala_id,owner_id) SELECT DISTINCT sala_id,NULL FROM mensajes_chat');
  const old=await tx.getAll("SELECT id,token FROM sesiones WHERE token NOT LIKE 'sid:%' AND token NOT LIKE 'legacy:%'");
  for(const row of old)await tx.runQuery('UPDATE sesiones SET token=?,activa=0 WHERE id=?',['legacy:'+crypto.createHash('sha256').update(row.token).digest('hex'),row.id]);
  return {legacySessionsRevoked:old.length};
 });
}
async function main(){let db;try{
 if(!process.env.BB_SQLITE_PATH?.trim()||!process.argv.includes('--confirm-security-p0'))throw new Error('Explicit migration destination and confirmation required');
 db=await openDatabase(requireExistingDatabase(),sqlite.OPEN_READWRITE);
 console.log(JSON.stringify({success:true,...await migrate(db)}));
}catch(error){logError('security.migration.failure',error);console.error('Actualización P0 no completada. Requiere BB_SQLITE_PATH explícito, respaldo y --confirm-security-p0.');process.exitCode=1;}finally{if(db)await close(db);}}
if(require.main===module)main();
module.exports={migrate};
