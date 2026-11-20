const path=require('node:path');
const {readEnvironment,port}=require('./demoEnvironment');
async function start(){
 const demo=await readEnvironment(process.env.BB_SQLITE_PATH,{allowSeeded:process.env.BB_DEMO_PREPARING==='1'});
 Object.assign(process.env,{BB_SQLITE_PATH:demo.file,BB_DEMO_DATABASE:'1',BB_DEMO_ISOLATED:'1',JWT_SECRET:demo.privateData.jwt,BB_CHECKOUT_HASH_SECRET:demo.privateData.hmac,PORT:String(port(process.env.BB_DEMO_API_PORT,4100)),EMAIL_USER:'',EMAIL_PASS:'',EMAIL_FROM_ADDRESS:'',EMAIL_FROM_NAME:'',BB_RECOVERY_TRANSPORT:process.env.BB_DEMO_RECOVERY_LOCAL==='1'?'local':'smtp',BB_RECOVERY_INBOX_DIR:path.join(demo.root,'mail'),FRONTEND_URL:'http://127.0.0.1:'+port(process.env.BB_DEMO_WEB_PORT,5173)});
 // Additional fail-closed guard: no SMTP transport is created even by a legacy caller.
 const nodemailer=require('nodemailer');nodemailer.createTransport=()=>{throw new Error('SMTP deshabilitado en demo aislada');};
 require(path.join(demo.runtime,'server/server.js'));
}
if(require.main===module)start().catch(()=>{console.error('No se pudo iniciar la demo aislada. Revise destino y preparación.');process.exitCode=1;});
module.exports={start};
