const fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const { HttpError }=require('../utils/httpErrors');
const projectRoot=path.resolve(__dirname,'../../..');
function localInbox(){
  const configured=process.env.BB_RECOVERY_INBOX_DIR;
  if(process.env.BB_DEMO_DATABASE!=='1'||!configured||!path.isAbsolute(configured))throw new HttpError('INTERNAL_ERROR');
  const stat=fs.lstatSync(configured);if(!stat.isDirectory()||stat.isSymbolicLink())throw new HttpError('INTERNAL_ERROR');
  const resolved=fs.realpathSync(configured),relative=path.relative(fs.realpathSync(projectRoot),resolved);
  if(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative))throw new HttpError('INTERNAL_ERROR');
  return resolved;
}
function createRecoveryDelivery(){
  const mode=()=>process.env.BB_RECOVERY_TRANSPORT||'smtp';
  return {
    enabled(){if(mode()==='local'){localInbox();return true;}if(mode()!=='smtp')throw new HttpError('INTERNAL_ERROR');return Boolean(process.env.EMAIL_USER&&process.env.EMAIL_PASS);},
    async deliver(email,token){
      if(mode()==='local'){
        const file=path.join(localInbox(),crypto.randomUUID()+'.json');
        await fsp.writeFile(file,JSON.stringify({to:email,subject:'Recuperación ficticia',token,resetRoute:'/reset-password',expiresInMinutes:15},null,2),{flag:'wx',mode:0o600});return;
      }
      if(mode()!=='smtp')throw new HttpError('INTERNAL_ERROR');
      const mail=require('nodemailer').createTransport({host:'smtp.gmail.com',port:587,secure:false,requireTLS:true,auth:{user:process.env.EMAIL_USER,pass:process.env.EMAIL_PASS}});
      await mail.sendMail({from:process.env.EMAIL_USER,to:email,subject:'Recuperación de acceso',text:'Use este token de un solo uso en POST /api/auth/reset-password con su nueva contraseña. Vence en 15 minutos: '+token});
    }
  };
}
module.exports={createRecoveryDelivery};
