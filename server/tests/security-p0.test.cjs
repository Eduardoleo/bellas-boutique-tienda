const test=require('node:test'),assert=require('node:assert/strict');
const {fixture,marker}=require('./p0Fixture.cjs');
const jwt=require('jsonwebtoken');
const exec=(db,sql)=>new Promise((r,j)=>db.exec(sql,e=>e?j(e):r()));
test('RF-01 original: knowing a room never authorizes foreign read write or state',async t=>{
 const b=await fixture(t),a=await b.login(1),other=await b.login(2);
 assert.equal((await b.request('/api/support/chat/fixture_room_1/mensajes',{token:a})).status,200);
 for(const [route,options]of [['/api/support/chat/fixture_room_1/mensajes',{}],['/api/support/chat/mensaje',{method:'POST',body:{sala_id:'fixture_room_1',mensaje:'foreign'}}],['/api/support/chat/fixture_room_1/leer',{method:'PUT',body:{}}]]){
 const result=await b.request(route,{...options,token:other});assert.equal(result.status,404);assert.doesNotMatch(result.text,new RegExp(marker));}
 assert.equal((await b.access.getOne('SELECT count(*) n FROM mensajes_chat')).n,1);
 assert.equal((await b.access.getOne('SELECT leido FROM mensajes_chat')).leido,0);
 assert.deepEqual((await b.request('/api/support/chat/salas',{token:other})).data.salas,[]);
});
test('RF-01 admin and vendor attend every room; clients only explicit ownership',async t=>{
 const b=await fixture(t),a=await b.login(1),other=await b.login(2),admin=await b.login(3),vendor=await b.login(4);
 const created=await b.request('/api/support/chat/salas',{token:other,method:'POST',body:{owner_id:1,sala_id:'forged'}});assert.equal(created.status,201);const room=created.data.sala_id;
 assert.equal((await b.access.getOne('SELECT owner_id FROM salas_chat WHERE sala_id=?',[room])).owner_id,2);
 assert.equal((await b.request('/api/support/chat/'+room+'/mensajes',{token:a})).status,404);
 for(const token of [admin,vendor]){
 assert.equal((await b.request('/api/support/chat/fixture_room_1/mensajes',{token})).status,200);
 assert.equal((await b.request('/api/support/chat/mensaje',{token,method:'POST',body:{sala_id:'fixture_room_1',mensaje:'support'}})).status,201);
 assert.equal((await b.request('/api/support/chat/fixture_room_1/leer',{token,method:'PUT',body:{}})).status,200);
 assert.equal((await b.request('/api/support/chat/salas',{token})).data.salas.length,2);
 }
 assert.equal((await b.request('/api/support/chat/mensaje',{token:a,method:'POST',body:{sala_id:'unregistered',mensaje:'try'}})).status,404);
 assert.equal((await b.request('/api/support/chat/fixture_room_1/leer',{token:a,method:'PUT',body:{}})).status,200);
 assert.equal((await b.request('/api/support/chat/mensaje',{token:a,method:'POST',body:{sala_id:'fixture_room_1',mensaje:'owner'}})).status,201);
 await b.access.runQuery('INSERT INTO mensajes_chat(sala_id,user_id,mensaje) VALUES(?,?,?)',['fixture_room_1',2,'contaminated legacy message']);
 assert.equal((await b.request('/api/support/chat/fixture_room_1/mensajes',{token:other})).status,404);
 assert.equal((await b.request('/api/support/chat/salas',{token:other})).data.salas.length,1);
});
test('RF-02 original: public tracking never returns personal values or history notes',async t=>{
 const b=await fixture(t),a=await b.login(1),other=await b.login(2);
 for(const token of [undefined,a,other]){
 const result=await b.request('/api/tracking/fixture_tracking',{token});assert.equal(result.status,200);assert.doesNotMatch(result.text,new RegExp(marker));
 assert.deepEqual(Object.keys(result.data.shipment).sort(),['tracking_number','status','estimated_delivery','central_at','mensajero_at','en_camino_at','entregado_at'].sort());
 for(const entry of result.data.history)assert.deepEqual(Object.keys(entry).sort(),['created_at','status']);
 }
});
test('RF-02 private tracking requires actual purchase ownership',async t=>{
 const b=await fixture(t),a=await b.login(1),other=await b.login(2);
 assert.equal((await b.request('/api/tracking/fixture_tracking/private')).status,401);
 const denied=await b.request('/api/tracking/fixture_tracking/private',{token:other});assert.equal(denied.status,404);assert.doesNotMatch(denied.text,new RegExp(marker));
 const own=await b.request('/api/tracking/fixture_tracking/private',{token:a});assert.equal(own.status,200);assert.equal(own.data.shipment.shipping_address,marker);
 assert.equal((await b.request('/api/tracking/absent')).status,404);assert.doesNotMatch(b.logs(),new RegExp(marker));
});
test('RF-03 original: logout revokes token and refresh immediately',async t=>{
 const b=await fixture(t),token=await b.login(1);assert.equal((await b.request('/api/users/profile',{token})).status,200);
 assert.equal((await b.request('/api/auth/logout',{token,method:'POST',body:{}})).status,200);
 assert.equal((await b.request('/api/users/profile',{token})).status,401);
 assert.equal((await b.request('/api/auth/refresh',{token,method:'POST',body:{}})).status,401);
 const rows=await b.access.getAll('SELECT token FROM sesiones');for(const row of rows){assert.match(row.token,/^sid:[a-f0-9]{64}$/);assert.notEqual(row.token,token);}
});
test('RF-03 suspended, deactivated and downgraded permissions use current state',async t=>{
 const b=await fixture(t),a=await b.login(1),admin=await b.login(3),vendor=await b.login(4);
 assert.equal((await b.request('/api/users/all',{token:admin})).status,200);
 assert.equal((await b.request('/api/users/admin/1/status',{token:admin,method:'PUT',body:{estado:'Suspendido',rol:'Cliente'}})).status,200);
 assert.equal((await b.request('/api/users/profile',{token:a})).status,401);assert.equal((await b.request('/api/auth/refresh',{token:a,method:'POST',body:{}})).status,401);
 await b.access.runQuery("UPDATE users SET estado='Activo' WHERE id=1");assert.equal((await b.request('/api/users/profile',{token:a})).status,401);
 assert.equal((await b.request('/api/support/chat/salas',{token:vendor})).data.salas.length,1);
 await b.access.runQuery("UPDATE users SET rol='Cliente' WHERE id=4");assert.equal((await b.request('/api/support/chat/fixture_room_1/mensajes',{token:vendor})).status,404);
 await b.access.runQuery("UPDATE users SET rol='Cliente' WHERE id=3");assert.equal((await b.request('/api/users/all',{token:admin})).status,403);
 const refreshed=await b.request('/api/auth/refresh',{token:admin,method:'POST',body:{}});assert.equal(refreshed.status,200);assert.equal(jwt.decode(refreshed.data.token).rol,'Cliente');
 await b.access.runQuery('UPDATE sesiones SET activa=0 WHERE user_id=3');assert.equal((await b.request('/api/users/profile',{token:refreshed.data.token})).status,401);
});
test('RF-03 refresh/logout race across two processes cannot resurrect session',async t=>{
 const b=await fixture(t),token=await b.login(1),port=await b.start();
 const [refresh,logout]=await Promise.all([b.request('/api/auth/refresh',{token,method:'POST',body:{},portValue:port}),b.request('/api/auth/logout',{token,method:'POST',body:{}})]);
 assert.equal(logout.status,200);assert.ok([200,401].includes(refresh.status));
 for(const value of [token,refresh.data.token].filter(Boolean))assert.equal((await b.request('/api/users/profile',{token:value})).status,401);
 assert.equal((await b.access.getOne('SELECT count(*) n FROM sesiones WHERE activa=1')).n,0);
});
test('RF-04 original: successful reset invalidates all previous sessions and refresh',async t=>{
 const b=await fixture(t),token=await b.login(1),reset=await b.resetToken(),pending=await b.resetToken();
 const sid=require('node:crypto').randomUUID();const key='sid:'+require('node:crypto').createHash('sha256').update(sid).digest('hex');await b.access.runQuery('INSERT INTO sesiones(user_id,token) VALUES(1,?)',[key]);const second=jwt.sign({userId:1,rol:'Cliente',sid},'synthetic-p0-key',{expiresIn:'10m'});
 assert.equal((await b.request('/api/users/profile',{token:second})).status,200);
 assert.equal((await b.request('/api/auth/reset-password',{method:'POST',body:{token:reset,password:'Fixture456!'}})).status,200);
 assert.equal((await b.request('/api/users/profile',{token})).status,401);assert.equal((await b.request('/api/auth/refresh',{token,method:'POST',body:{}})).status,401);
 assert.equal((await b.request('/api/users/profile',{token:second})).status,401);assert.equal((await b.request('/api/auth/refresh',{token:second,method:'POST',body:{}})).status,401);
 for(const value of [reset,pending])assert.equal((await b.request('/api/auth/reset-password',{method:'POST',body:{token:value,password:'Fixture789!'}})).status,400);
 assert.equal((await b.request('/api/auth/login',{method:'POST',body:{email:'fixture1@example.test',password:'Fixture123!'}})).status,401);
 const login=await b.request('/api/auth/login',{method:'POST',body:{email:'fixture1@example.test',password:'Fixture456!'}});assert.equal(login.status,200);assert.equal((await b.request('/api/users/profile',{token:login.data.token})).status,200);
});
test('RF-04 reset/refresh race across processes never leaves a usable old family',async t=>{
 const b=await fixture(t),token=await b.login(1),reset=await b.resetToken(),port=await b.start();
 const [updated,refreshed]=await Promise.all([b.request('/api/auth/reset-password',{method:'POST',body:{token:reset,password:'Fixture456!'}}),b.request('/api/auth/refresh',{token,method:'POST',body:{},portValue:port})]);
 assert.equal(updated.status,200);assert.ok([200,401].includes(refreshed.status));for(const value of [token,refreshed.data.token].filter(Boolean))assert.equal((await b.request('/api/users/profile',{token:value})).status,401);
 assert.equal((await b.access.getOne('SELECT count(*) n FROM sesiones WHERE activa=1')).n,0);
});
test('RF-04 expiry and atomic failure preserve session, password and reset proof',async t=>{
 const b=await fixture(t),token=await b.login(1),reset=await b.resetToken();await b.access.runQuery('UPDATE portfolio_password_resets SET expires_at=0');
 assert.equal((await b.request('/api/auth/reset-password',{method:'POST',body:{token:reset,password:'Fixture456!'}})).status,400);assert.equal((await b.request('/api/users/profile',{token})).status,200);
 const fresh=await b.resetToken();await exec(b.db,"CREATE TRIGGER fail_revocation BEFORE UPDATE ON sesiones BEGIN SELECT RAISE(ABORT,'PRIVATE_P0_FIXTURE');END");
 const result=await b.request('/api/auth/reset-password',{method:'POST',body:{token:fresh,password:'Fixture456!'}});assert.equal(result.status,500);assert.doesNotMatch(result.text,new RegExp(marker));assert.doesNotMatch(b.logs(),new RegExp(marker));
 assert.equal((await b.access.getOne('SELECT used FROM portfolio_password_resets ORDER BY expires_at DESC LIMIT 1')).used,0);assert.equal((await b.request('/api/users/profile',{token})).status,200);
});
test('P0 migration preserves existing data, quarantines legacy rooms and hashes old tokens',async t=>{
 const b=await fixture(t),token=await b.login(1);await exec(b.db,'DROP TABLE salas_chat');await b.access.runQuery('INSERT INTO sesiones(user_id,token) VALUES(?,?)',[2,'synthetic-legacy-jwt']);
 const {validateDatabase}=require('../src/config/databaseLifecycle');await assert.rejects(validateDatabase(b.db));const {migrate}=require('../scripts/migrateSecurityP0');assert.equal((await migrate(b.db)).legacySessionsRevoked,1);assert.equal((await migrate(b.db)).legacySessionsRevoked,0);await validateDatabase(b.db);assert.deepEqual(await b.access.getAll('PRAGMA foreign_key_check'),[]);
 assert.equal((await b.access.getOne('SELECT count(*) n FROM users')).n,4);assert.equal((await b.access.getOne('SELECT count(*) n FROM purchases')).n,1);assert.equal((await b.access.getOne('SELECT mensaje FROM mensajes_chat')).mensaje,marker);assert.equal((await b.access.getOne('SELECT owner_id FROM salas_chat')).owner_id,null);
 const old=await b.access.getOne("SELECT token,activa FROM sesiones WHERE user_id=2");assert.match(old.token,/^legacy:[a-f0-9]{64}$/);assert.equal(old.activa,0);
 assert.equal((await b.request('/api/support/chat/fixture_room_1/mensajes',{token})).status,404);
});

test('P0 current sessions retain invoice and purchase ownership through real HTTP',async t=>{
 const b=await fixture(t),a=await b.login(1),other=await b.login(2);
 const fs=require('node:fs/promises'),path=require('node:path');const id=require('node:crypto').randomBytes(8).toString('hex');const dir=path.resolve(__dirname,'../src/invoices');await fs.mkdir(dir,{recursive:true});const file=path.join(dir,'factura_'+id+'.pdf');await fs.writeFile(file,'Ficticio',{flag:'wx'});t.after(()=>fs.unlink(file));
 await b.access.runQuery('INSERT INTO invoices(user_id,purchase_id,consecutivo,cliente_nombre,cliente_identificacion,cliente_direccion,cliente_correo,cliente_telefono,monto_sin_iva,monto_con_iva,envio,total,cantidad_productos,pdf_path) VALUES(1,11,?,?,?,?,?,?,100,100,0,100,1,?)',[id,marker,marker,marker,'fixture@example.test',marker,file]);
 assert.equal((await b.request('/api/users/invoice/factura_'+id+'.pdf')).status,401);
 assert.equal((await b.request('/api/users/invoice/factura_'+id+'.pdf',{token:other})).status,404);
 assert.equal((await b.request('/api/users/invoice/factura_'+id+'.pdf',{token:a})).status,200);
 const foreign=await b.request('/api/users/purchases',{token:other});assert.equal(foreign.status,200);assert.doesNotMatch(foreign.text,new RegExp(marker));
});
test('P0 migration CLI rejects missing destination/confirmation without writes',async t=>{
 const b=await fixture(t),{promisify}=require('node:util'),run=promisify(require('node:child_process').execFile),path=require('node:path');
 const script=path.resolve(__dirname,'../scripts/migrateSecurityP0.js');
 for(const [file,args]of [['',[]],[b.file,[]]]){
 const before=await require('node:fs/promises').readFile(b.file);
 await assert.rejects(run(process.execPath,[script,...args],{cwd:path.dirname(b.file),env:{...process.env,BB_SQLITE_PATH:file}}),e=>e.code===1);
 assert.deepEqual(await require('node:fs/promises').readFile(b.file),before);
 }
});
