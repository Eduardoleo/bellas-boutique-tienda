const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {spawn}=require('node:child_process');
const sqlite3=require('sqlite3');
const jwt=require('jsonwebtoken');
const {initializeDatabase,openDatabase,close}=require('../src/config/databaseLifecycle');
const {rawAccess}=require('../src/config/sqliteOperations');
const serverRoot=path.resolve(__dirname,'..');
const marker='PRIVATE_BACKEND_SQL_PASSWORD_EMAIL';
const key='synthetic-bb10-key';
const sid='11111111-1111-4111-8111-111111111111';
const {sessionKey}=require('../src/services/sessionService');
const exec=(db,sql)=>new Promise((resolve,reject)=>db.exec(sql,error=>error?reject(error):resolve()));
async function backend(t,{mail=false}={}) {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'bb10-backend-'));const file=path.join(dir,'fixture.sqlite');
  await initializeDatabase({file});const db=await openDatabase(file,sqlite3.OPEN_READWRITE);
  await exec(db,"INSERT INTO users(id,name,email,password,phone,address,rol) VALUES(1,'Fixture','fixture@example.test','synthetic','00000000','Ficticia','Cliente');INSERT INTO products(id,name,price,category,gender) VALUES(1,'Fixture',100,'Demo','mujer');INSERT INTO stock(product_id,quantity) VALUES(1,10);INSERT INTO cart(user_id,product_id,quantity) VALUES(1,1,1)");
  await rawAccess(db).runQuery('INSERT INTO sesiones(user_id,token) VALUES(1,?)',[sessionKey(sid)]);
  let output='';
  const boot = "const path=require('node:path');const serverRoot="+JSON.stringify(serverRoot)+";"+
    "const pdf=require.resolve('pdfkit',{paths:[serverRoot]});require.cache[pdf]={id:pdf,filename:pdf,loaded:true,exports:class{constructor(){throw new Error("+JSON.stringify(marker)+")}}};"+
    "const mail=require.resolve('nodemailer',{paths:[serverRoot]});require.cache[mail]={id:mail,filename:mail,loaded:true,exports:{createTransport(){return {verify:async()=>{},sendMail:async()=>{throw new TypeError("+JSON.stringify(marker)+")}}}}};"+
    "const cron=require.resolve('node-cron',{paths:[serverRoot]});require.cache[cron]={id:cron,filename:cron,loaded:true,exports:{schedule(){return {stop(){}}}}};"+
    "require(path.join(serverRoot,'server.js'));";
  const child=spawn(process.execPath,['-e',boot],{cwd:dir,env:{...process.env,BB_SQLITE_PATH:file,JWT_SECRET:key,BB_CHECKOUT_HASH_SECRET:'synthetic-checkout-fingerprint-key-32',PORT:'0',EMAIL_USER:mail?'fixture@example.test':'',EMAIL_PASS:mail?marker:'',BB_DEMO_DATABASE:''},windowsHide:true,stdio:['ignore','pipe','pipe']});
  t.after(async()=>{if(child.exitCode===null&&child.signalCode===null){const exited=new Promise(resolve=>child.once('exit',resolve));child.kill();await exited}await close(db);await fs.rm(dir,{recursive:true,force:true})});
  const port=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('backend startup timeout')),10000);
    const consume=chunk=>{output+=chunk.toString();const match=output.match(/API lista en puerto (\d+)/);if(match){clearTimeout(timer);resolve(Number(match[1]))}};
    child.stdout.on('data',consume);child.stderr.on('data',consume);child.once('error',e=>{clearTimeout(timer);reject(e)});child.once('exit',code=>{clearTimeout(timer);reject(new Error('backend exit '+code))});
  });
  const token=rol=>jwt.sign({userId:1,rol,email:'fixture@example.test',sid},key);
  async function request(route,{method='GET',body,rol='Cliente',tokenValue,raw,key}={}) {
    if(rol==='Administrador')await rawAccess(db).runQuery("UPDATE users SET rol='Administrador' WHERE id=1");
    const headers={...(route==='/api/payments/process'?{'Idempotency-Key':key||require('node:crypto').randomUUID()}:{}),authorization:'Bearer '+(tokenValue||token(rol)),cookie:'fixture='+marker,'x-request-id':marker};
    if(body!==undefined||raw!==undefined)headers['content-type']='application/json';
    const response=await fetch('http://127.0.0.1:'+port+route,{method,headers,body:raw!==undefined?raw:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
    const text=await response.text();assert.doesNotMatch(text,new RegExp(marker));assert.doesNotMatch(output,new RegExp(marker));
    return {status:response.status,body:JSON.parse(text)};
  }
  return {db,access:rawAccess(db),request,logs:()=>output};
}
const payment={identificacion:'FICTICIA',cartItems:[{product_id:1,quantity:1,price:0.01}],total:0.01};
async function unchangedPurchase(access){
  for(const table of ['purchases','purchase_items','ventas','stock_movements','invoices'])assert.equal((await access.getOne('SELECT count(*) n FROM '+table)).n,0);
  assert.equal((await access.getOne('SELECT quantity FROM stock')).quantity,10);assert.equal((await access.getOne('SELECT count(*) n FROM cart')).n,1);
}

test('BB-10 real backend SQL query failure is safe 500 and the process remains alive',async t=>{
  const b=await backend(t);await exec(b.db,'DROP TABLE products');const result=await b.request('/api/catalog/women');
  assert.equal(result.status,500);assert.equal(result.body.code,'INTERNAL_ERROR');assert.ok(result.body.errorId);assert.doesNotMatch(b.logs(),/SELECT p|no such table| at .*\.js/);assert.equal((await b.request('/api/health')).status,200);
});

test('BB-10 real backend rejects malformed/invalid bodies and future tokens with correct statuses',async t=>{
  const b=await backend(t);
  assert.equal((await b.request('/api/auth/login',{method:'POST',raw:'{"password":"'+marker})).status,400);
  assert.equal((await b.request('/api/auth/login',{method:'POST',body:{email:{value:marker},password:'Fixture123!'}})).status,400);
  assert.equal((await b.request('/api/reports/dashboard')).status,403);
  const future=jwt.sign({userId:1,rol:'Administrador'},key,{notBefore:'1h'});assert.equal((await b.request('/api/reports/dashboard',{tokenValue:future})).status,401);
});

test('BB-10 payment pretransaction SQL rejection is handled without an unhandled promise',async t=>{
  const b=await backend(t);await exec(b.db,'DROP TABLE users');const result=await b.request('/api/payments/process',{method:'POST',body:payment});
  assert.equal(result.status,500);assert.equal(result.body.success,false);assert.doesNotMatch(b.logs(),/UnhandledPromiseRejection|uncaughtException/);assert.equal((await b.request('/api/health')).status,200);
});

test('BB-10 purchase item SQL failure rolls back all writes before the HTTP response',async t=>{
  const b=await backend(t);await exec(b.db,"CREATE TRIGGER fail_items BEFORE INSERT ON purchase_items BEGIN SELECT RAISE(ABORT,'"+marker+"');END");
  assert.equal((await b.request('/api/payments/process',{method:'POST',body:payment})).status,500);await unchangedPurchase(b.access);
});

test('BB-10 invoice SQL failure rolls back stock, sale, movement, purchase and cart changes',async t=>{
  const b=await backend(t);await exec(b.db,"CREATE TRIGGER fail_invoice BEFORE INSERT ON invoices BEGIN SELECT RAISE(ABORT,'"+marker+"');END");
  assert.equal((await b.request('/api/payments/process',{method:'POST',body:payment})).status,500);await unchangedPurchase(b.access);
});

test('BB-10 committed purchase exposes partial effects and never marks an unsent invoice email as sent',async t=>{
  const b=await backend(t,{mail:true});
  await exec(b.db,"INSERT INTO products(id,name,price,category,gender) VALUES(2,'Fixture dos',200,'Demo','mujer');INSERT INTO stock(product_id,quantity) VALUES(2,10)");
  const result=await b.request('/api/payments/process',{method:'POST',body:{...payment,cartItems:[...payment.cartItems,{product_id:2,quantity:1}]}});
  assert.equal(result.status,200);assert.equal(result.body.success,true);assert.equal(result.body.paymentStatus,'simulated');assert.equal(result.body.completion,'partial');assert.deepEqual(result.body.warnings,['EFFECTS_PENDING']);
  let effects;for(let i=0;i<100;i++){effects=await b.access.getOne('SELECT * FROM checkout_effects');if(effects?.invoice_email==='failed')break;await new Promise(r=>setTimeout(r,10));}
  assert.equal(effects.invoice_files,'failed');assert.equal(effects.shipping_email,'unknown');
  assert.equal((await b.access.getOne('SELECT count(*) n FROM purchases')).n,1);assert.equal((await b.access.getOne('SELECT email_sent FROM invoices')).email_sent,0);assert.equal((await b.access.getOne('SELECT quantity FROM stock WHERE product_id=1')).quantity,9);assert.equal((await b.access.getOne('SELECT count(DISTINCT fecha_venta) n FROM ventas')).n,1);assert.equal((await b.access.getOne('SELECT total_amount FROM purchases')).total_amount,3300);assert.doesNotMatch(b.logs(),new RegExp(marker));
});

test('BB-10 registration audit failure does not leave a user or client partially created',async t=>{
  const b=await backend(t);await exec(b.db,"CREATE TRIGGER fail_registration_audit BEFORE INSERT ON bitacora BEGIN SELECT RAISE(ABORT,'"+marker+"');END");
  const result=await b.request('/api/auth/register',{method:'POST',body:{name:'Fixture nueva',email:'new@example.test',password:'Fixture123!'}});
  assert.equal(result.status,500);assert.equal((await b.access.getOne('SELECT count(*) n FROM users')).n,1);assert.equal((await b.access.getOne('SELECT count(*) n FROM clientes')).n,0);
});

test('BB-10 recovery SQL failures remain errors while SMTP failures preserve private acceptance',async t=>{
  const b=await backend(t,{mail:true});
  let result=await b.request('/api/auth/forgot-password',{method:'POST',body:{email:'fixture@example.test'}});assert.equal(result.status,202);assert.equal(result.body.success,true);for(let i=0;i<100;i++){if(b.logs().includes('recovery.delivery.failure')&&(await b.access.getOne('SELECT count(*) n FROM portfolio_password_resets')).n===0)break;await new Promise(r=>setTimeout(r,10));}assert.match(b.logs(),/recovery.delivery.failure/);assert.equal((await b.access.getOne('SELECT count(*) n FROM portfolio_password_resets')).n,0);
  await exec(b.db,'DROP TABLE users');result=await b.request('/api/auth/forgot-password',{method:'POST',body:{email:'fixture@example.test'}});assert.equal(result.status,500);
});

test('BB-10 inactive users receive generic 401 without token generation or false login success',async t=>{
  const b=await backend(t);await exec(b.db,"UPDATE users SET estado='Inactivo' WHERE id=1");const result=await b.request('/api/auth/login',{method:'POST',body:{email:'fixture@example.test',password:'Fixture123!'}});
  assert.equal(result.status,401);assert.equal(result.body.code,'INVALID_CREDENTIALS');assert.equal(result.body.success,false);assert.equal(result.body.token,undefined);
});

test('BB-10 corrupt stored report JSON produces an error instead of a successful empty report',async t=>{
  const b=await backend(t);await exec(b.db,"INSERT INTO reportes_diarios(fecha,productos_stock_bajo) VALUES('2026-10-13','"+marker+"')");
  const result=await b.request('/api/reports/diario?fecha=2026-10-13',{rol:'Administrador'});assert.equal(result.status,500);assert.equal(result.body.success,false);
});

test('BB-10 support creation and audit roll back as one operation',async t=>{
  const b=await backend(t);await exec(b.db,"CREATE TRIGGER fail_support_audit BEFORE INSERT ON bitacora BEGIN SELECT RAISE(ABORT,'"+marker+"');END");
  const result=await b.request('/api/support/sugerencias',{method:'POST',body:{titulo:'Fixture',descripcion:'Ficticia'}});
  assert.equal(result.status,500);assert.equal((await b.access.getOne('SELECT count(*) n FROM sugerencias')).n,0);
});

test('BB-10 support rejection reports failed email truthfully after atomic state/audit commit',async t=>{
  const b=await backend(t,{mail:true});await exec(b.db,"INSERT INTO sugerencias(id,user_id,titulo,descripcion) VALUES(1,1,'Fixture','Ficticia')");
  const result=await b.request('/api/support/sugerencias/1/rechazar',{method:'PUT',rol:'Administrador',body:{motivo:marker}});
  assert.equal(result.status,200);assert.ok(result.body.warnings.includes('EMAIL_NOT_SENT'));assert.match(result.body.message,/correo pendiente/);
  assert.equal((await b.access.getOne('SELECT estado FROM sugerencias WHERE id=1')).estado,'Rechazada');assert.equal((await b.access.getOne('SELECT count(*) n FROM bitacora')).n,1);
});

test('BB-10 login, refresh and logout still succeed through nested transaction boundaries',async t=>{
  const b=await backend(t);const bcrypt=require('bcrypt');await b.access.runQuery('UPDATE users SET password=? WHERE id=1',[await bcrypt.hash('Fixture123!',10)]);
  const login=await b.request('/api/auth/login',{method:'POST',body:{email:'fixture@example.test',password:'Fixture123!'}});assert.equal(login.status,200);assert.ok(login.body.token);
  const refresh=await b.request('/api/auth/refresh',{method:'POST',body:{},tokenValue:login.body.token});assert.equal(refresh.status,200);assert.ok(refresh.body.token);
  const logout=await b.request('/api/auth/logout',{method:'POST',body:{},tokenValue:refresh.body.token});assert.equal(logout.status,200);assert.equal((await b.access.getOne('SELECT count(*) n FROM sesiones WHERE activa=1')).n,0);
});

test('BB-10 logout audit failure rolls back session closure',async t=>{
  const b=await backend(t);await exec(b.db,"CREATE TRIGGER fail_logout_audit BEFORE INSERT ON bitacora BEGIN SELECT RAISE(ABORT,'"+marker+"');END");
  const token=jwt.sign({userId:1,rol:'Cliente',sid},key);
  const result=await b.request('/api/auth/logout',{method:'POST',body:{},tokenValue:token});assert.equal(result.status,500);assert.equal((await b.access.getOne('SELECT activa FROM sesiones')).activa,1);
});
