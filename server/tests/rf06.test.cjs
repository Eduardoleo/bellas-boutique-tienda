const test=require('node:test'),assert=require('node:assert/strict');
const {fixture,marker}=require('./p0Fixture.cjs');
const post=(b,route,body)=>b.request('/api/auth/'+route,{method:'POST',body});
const safe=(b,r)=>{assert.doesNotMatch(r.text,/PRIVATE_P0_FIXTURE|Fixture123!|rf06-private-password|fixture1@example.test/);assert.doesNotMatch(b.logs(),/PRIVATE_P0_FIXTURE|Fixture123!|rf06-private-password|fixture1@example.test|synthetic-p0-key/)};
test('RF-06 unknown and wrong password have equivalent public login with comparable work',async t=>{
 const b=await fixture(t),times={unknown:[],wrong:[]};let unknown,wrong;
 for(let i=0;i<4;i++){let start=performance.now();unknown=await post(b,'login',{email:'absent@example.test',password:'rf06-private-password'});times.unknown.push(performance.now()-start);start=performance.now();wrong=await post(b,'login',{email:'fixture1@example.test',password:'rf06-private-password'});times.wrong.push(performance.now()-start)}
 t.diagnostic(JSON.stringify({timingsMs:times}));assert.equal(unknown.status,401);assert.equal(wrong.status,401);assert.deepEqual(unknown.data,wrong.data);assert.equal(unknown.data.code,'INVALID_CREDENTIALS');safe(b,unknown);safe(b,wrong);assert.equal((await b.access.getOne('SELECT count(*) n FROM sesiones')).n,0);
});
test('RF-06 valid login contract and suspended account remain safe',async t=>{
 const b=await fixture(t),ok=await post(b,'login',{email:'fixture1@example.test',password:'Fixture123!'});assert.equal(ok.status,200);assert.equal(ok.data.success,true);assert.ok(ok.data.token);assert.equal(ok.data.user.id,1);assert.equal(ok.data.user.password,undefined);
 await b.access.runQuery("UPDATE users SET estado='Inactivo' WHERE id=1");const suspended=await post(b,'login',{email:'fixture1@example.test',password:'Fixture123!'}),absent=await post(b,'login',{email:'absent@example.test',password:'Fixture123!'});assert.equal(suspended.status,401);assert.deepEqual(suspended.data,absent.data);assert.equal(suspended.data.token,undefined);assert.equal((await b.request('/api/auth/verify',{token:ok.data.token})).status,401);safe(b,suspended);
});
test('RF-06 SMTP failure cannot distinguish existing and nonexistent recovery accounts',async t=>{
 const b=await fixture(t,{failRecoveryMail:true});const missing=await post(b,'forgot-password',{email:'absent@example.test'}),known=await post(b,'forgot-password',{email:'fixture1@example.test'});assert.equal(known.status,202);assert.deepEqual(known.data,missing.data);assert.equal(missing.status,202);
 for(let i=0;i<100;i++){if(b.logs().includes('recovery.delivery.failure')&&(await b.access.getOne('SELECT count(*) n FROM portfolio_password_resets')).n===0)break;await new Promise(r=>setTimeout(r,10))}assert.equal((await b.access.getOne('SELECT count(*) n FROM portfolio_password_resets')).n,0);assert.match(b.logs(),/recovery.delivery.failure/);safe(b,known);safe(b,missing);
});
test('RF-06 public recovery acceptance does not wait for SMTP response',async t=>{
 const b=await fixture(t,{holdRecoveryMail:true}),r=await post(b,'forgot-password',{email:'fixture1@example.test'});assert.equal(r.status,202);assert.equal(r.data.token,undefined);safe(b,r);
});
test('RF-06 nonexistent recovery creates no tokens and accepted bodies are equal',async t=>{
 const b=await fixture(t);const missing=await post(b,'forgot-password',{email:'absent@example.test'});assert.equal(missing.status,202);assert.equal((await b.access.getOne('SELECT count(*) n FROM portfolio_password_resets')).n,0);assert.equal(b.mailCount(),0);const known=await post(b,'forgot-password',{email:'fixture1@example.test'});assert.deepEqual(known.data,missing.data);assert.equal(known.status,202);safe(b,known);
});
test('RF-06 reset retains single use, session revocation and invalidates other pending tokens',async t=>{
 const b=await fixture(t),session=await b.login(1),first=await b.resetToken(),second=await b.resetToken();const reset=await post(b,'reset-password',{token:first,password:'Replacement123!'});assert.equal(reset.status,200);assert.equal((await post(b,'reset-password',{token:first,password:'Replacement456!'})).status,400);assert.equal((await post(b,'reset-password',{token:second,password:'Replacement456!'})).status,400);assert.equal((await b.request('/api/auth/verify',{token:session})).status,401);assert.equal((await b.request('/api/auth/refresh',{token:session,method:'POST',body:{}})).status,401);assert.equal((await post(b,'login',{email:'fixture1@example.test',password:'Replacement123!'})).status,200);safe(b,reset);
});
test('RF-06 expired reset is rejected without password or session changes',async t=>{
 const b=await fixture(t),session=await b.login(1),token=await b.resetToken();await b.access.runQuery('UPDATE portfolio_password_resets SET expires_at=0');const before=await b.access.getOne('SELECT password FROM users WHERE id=1'),r=await post(b,'reset-password',{token,password:'Replacement123!'});assert.equal(r.status,400);assert.deepEqual(await b.access.getOne('SELECT password FROM users WHERE id=1'),before);assert.equal((await b.request('/api/auth/verify',{token:session})).status,200);safe(b,r);
});
test('RF-06 invalid login/recovery input stays independent of account lookup',async t=>{
 const b=await fixture(t);assert.equal((await post(b,'login',{email:{secret:marker},password:marker})).status,400);assert.equal((await post(b,'forgot-password',{email:{secret:marker}})).status,400);assert.equal((await b.request('/api/health')).status,200);
});
test('RF-06 queued SQL failure is private; global storage failure stays equivalent and observable',async t=>{
 const b=await fixture(t);assert.equal((await post(b,'forgot-password',{email:'absent@example.test'})).status,202);await new Promise((r,j)=>b.db.exec("CREATE TRIGGER fail_reset BEFORE INSERT ON portfolio_password_resets BEGIN SELECT RAISE(ABORT,'PRIVATE_P0_FIXTURE');END",e=>e?j(e):r()));
 const known=await post(b,'forgot-password',{email:'fixture1@example.test'}),missing=await post(b,'forgot-password',{email:'absent@example.test'});assert.equal(known.status,202);assert.deepEqual(known.data,missing.data);for(let i=0;i<100&&!b.logs().includes('recovery.processing.failure');i++)await new Promise(r=>setTimeout(r,10));assert.match(b.logs(),/recovery.processing.failure/);assert.equal((await b.access.getOne('SELECT count(*) n FROM portfolio_password_resets')).n,0);safe(b,known);
 await b.access.runQuery('DROP TABLE users');for(const email of ['fixture1@example.test','absent@example.test']){const r=await post(b,'forgot-password',{email});assert.equal(r.status,500);assert.equal(r.data.code,'INTERNAL_ERROR');safe(b,r)}
});
