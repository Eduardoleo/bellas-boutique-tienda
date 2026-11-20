const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process');
const sqlite=require('sqlite3'),bcrypt=require('bcrypt');
const {initializeDatabase,openDatabase,close}=require('../src/config/databaseLifecycle');
const {rawAccess}=require('../src/config/sqliteOperations');
const serverRoot=path.resolve(__dirname,'..');
const marker='PRIVATE_P0_FIXTURE';
async function fixture(t,{failPdf=false,checkoutPause='',fakePdfSuccess=false,rejectMail=false,failRecoveryMail=false,holdRecoveryMail=false,localRecovery=false}={}){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'boutique-p0-test-')),file=path.join(dir,'fixture.sqlite');
 if(localRecovery)await fs.mkdir(path.join(dir,'mail'));await initializeDatabase({file});const db=await openDatabase(file,sqlite.OPEN_READWRITE),access=rawAccess(db);
 const children=[]; t.after(async()=>{for(const child of children){if(child.exitCode===null && child.signalCode===null){const exited=new Promise(r=>child.once('exit',r));child.kill();await exited}}await close(db);const resolved=path.resolve(dir);if(path.dirname(resolved)!==path.resolve(os.tmpdir())||!path.basename(resolved).startsWith('boutique-p0-test-'))throw new Error('Unsafe fixture cleanup target');await fs.rm(resolved,{recursive:true,force:true})});
 const password=await bcrypt.hash('Fixture123!',10);
 for(const [id,role]of [[1,'Cliente'],[2,'Cliente'],[3,'Administrador'],[4,'Vendedor']])await access.runQuery('INSERT INTO users(id,name,email,password,address,phone,rol) VALUES(?,?,?,?,?,?,?)',[id,'Fixture '+id,'fixture'+id+'@example.test',password,marker,marker,role]);
 await access.runQuery('INSERT INTO purchases(id,user_id,total_amount,payment_method) VALUES(11,1,100,?)',['Ficticio']);
 await access.runQuery('INSERT INTO shipments(purchase_id,tracking_number,shipping_address,recipient_name,recipient_phone,delivery_notes,courier_name) VALUES(11,?,?,?,?,?,?)',['fixture_tracking',marker,marker,marker,marker,marker]);
 const shipment=await access.getOne('SELECT id FROM shipments');
 await access.runQuery('INSERT INTO shipment_status_history(shipment_id,status,notes,changed_by) VALUES(?,?,?,?)',[shipment.id,'central',marker,marker]);
 await access.runQuery('INSERT INTO mensajes_chat(sala_id,user_id,mensaje) VALUES(?,?,?)',['fixture_room_1',1,marker]);
 const table=await access.getOne("SELECT name FROM sqlite_master WHERE name='salas_chat'");
 if(table)await access.runQuery('INSERT INTO salas_chat(sala_id,owner_id) VALUES(?,?)',['fixture_room_1',1]);
 let output='',port;const resets=[],pauses=[];let sentCount=0;const ports=new Map();let pauseWaiting;
 const boot="const root="+JSON.stringify(serverRoot)+";const rejectMail="+JSON.stringify(rejectMail)+";const failRecoveryMail="+JSON.stringify(failRecoveryMail)+";const holdRecoveryMail="+JSON.stringify(holdRecoveryMail)+";"+
 (fakePdfSuccess?"const p=require.resolve('pdfkit',{paths:[root]});const EventEmitter=require('node:events');require.cache[p]={id:p,filename:p,loaded:true,exports:class extends EventEmitter{constructor(){super();let proxy;proxy=new Proxy(this,{get:(target,key)=>key in target?(typeof target[key]==='function'?target[key].bind(target):target[key]):()=>proxy});return proxy;}pipe(stream){stream.end('Documento ficticio');return stream;}}};":'')+
 (failPdf?"const p=require.resolve('pdfkit',{paths:[root]});require.cache[p]={id:p,filename:p,loaded:true,exports:class{constructor(){throw new Error('PRIVATE_P0_FIXTURE')}}};":"")+
 "const m=require.resolve('nodemailer',{paths:[root]});require.cache[m]={id:m,filename:m,loaded:true,exports:{createTransport(){return{verify:async()=>{},sendMail:async o=>{const token=o.text?.match(/[a-f0-9]{64}$/)?.[0];if(token&&failRecoveryMail)throw new Error('PRIVATE_P0_FIXTURE');if(token&&holdRecoveryMail)return new Promise(()=>{});if(token)process.send({token});process.send({mailSent:true});return{accepted:rejectMail?[]:[o.to]}}}}}};"+
 "const c=require.resolve('node-cron',{paths:[root]});require.cache[c]={id:c,filename:c,loaded:true,exports:{schedule(){return{stop(){}}}}};require(root+'/server.js');";
 async function start(pause=''){
 const hook=pause?"const coord=require(root+'/src/services/checkoutIdempotency');const original=coord.coordinator;const gate=()=>new Promise(resolve=>{process.send({pause:true});process.once('message',resolve)});coord.coordinator=db=>{const service=original(db);return{...service,execute:async options=>{"+(pause==='before'?"const work=options.work;options.work=async tx=>{const value=await work(tx);await gate();return value;};return service.execute(options);":"const result=await service.execute(options);if(!result.replayed)await gate();return result;")+"}}};":'';
 const code=boot.replace("require(root+'/server.js');",hook+"require(root+'/server.js');");
 const child=spawn(process.execPath,['-e',code],{cwd:dir,env:{...process.env,BB_SQLITE_PATH:file,PORT:'0',JWT_SECRET:'synthetic-p0-key',BB_CHECKOUT_HASH_SECRET:'synthetic-checkout-fingerprint-key-32',EMAIL_USER:'fixture@example.test',EMAIL_PASS:'synthetic-only',BB_DEMO_DATABASE:localRecovery?'1':'',BB_RECOVERY_TRANSPORT:localRecovery?'local':'smtp',BB_RECOVERY_INBOX_DIR:localRecovery?path.join(dir,'mail'):''},windowsHide:true,stdio:['ignore','pipe','pipe','ipc']});
 children.push(child);
 child.on('message',msg=>{if(msg.token)resets.push(msg.token);if(msg.mailSent)sentCount++;if(msg.pause){if(pauseWaiting){pauseWaiting();pauseWaiting=null;}else pauses.push(true);}});
 const p=await new Promise((resolve,reject)=>{let local='';const timer=setTimeout(()=>reject(new Error('Fixture startup timeout')),12000);const consume=b=>{local+=b;output+=b;const m=local.match(/API lista en puerto (\d+)/);if(m){clearTimeout(timer);resolve(Number(m[1]))}};child.stdout.on('data',consume);child.stderr.on('data',consume);child.once('error',reject);child.once('exit',()=>{clearTimeout(timer);reject(new Error('Fixture exited'))})});
 ports.set(p,child);return p;
 }
 port=await start(checkoutPause);
 async function request(route,{token,method='GET',body,portValue=port,key,headers:extraHeaders={}}={}){
 const response=await fetch('http://127.0.0.1:'+portValue+route,{method,headers:{...((route==='/api/payments/process')?{'Idempotency-Key':key||require('node:crypto').randomUUID()}:{}),...extraHeaders,...(token?{authorization:'Bearer '+token}:{}),...(body!==undefined?{'content-type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const text=await response.text();let data;try{data=JSON.parse(text)}catch{data={file:text}}return{status:response.status,data,text,headers:Object.fromEntries(response.headers)};
 }
 async function login(id){const result=await request('/api/auth/login',{method:'POST',body:{email:'fixture'+id+'@example.test',password:'Fixture123!'}});if(result.status!==200)throw new Error('Fixture login failed');return result.data.token;}
 async function resetToken(){await request('/api/auth/forgot-password',{method:'POST',body:{email:'fixture1@example.test'}});for(let n=0;n<100;n++){if(resets.length)return resets.shift();await new Promise(r=>setTimeout(r,10))}throw new Error('Fixture mail timeout');}
 return{db,access,file,request,login,resetToken,start,logs:()=>output,marker,mailCount:()=>sentCount,
 pauseReady:()=>pauses.length?(pauses.shift(),Promise.resolve()):new Promise((resolve,reject)=>{pauseWaiting=resolve;setTimeout(()=>{if(pauseWaiting){pauseWaiting=null;reject(new Error('Fixture pause timeout'));}},5000).unref();}),
 stop:async(p=port)=>{const child=ports.get(p);if(child&&child.exitCode===null&&child.signalCode===null){const exited=new Promise(r=>child.once('exit',r));child.kill();await exited;}}
 };
}
module.exports={fixture,marker};
