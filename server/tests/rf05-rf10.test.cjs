const test=require('node:test'),assert=require('node:assert/strict');
const {fixture,marker}=require('./p0Fixture.cjs');
const exec=(db,sql)=>new Promise((r,j)=>db.exec(sql,e=>e?j(e):r()));
async function setup(t){
 const b=await fixture(t,{failPdf:true});
 await b.access.runQuery('INSERT INTO purchases(id,user_id,total_amount,payment_method) VALUES(12,2,987654.75,?)',['Ficticio']);
 for(const id of [3,4])await b.access.runQuery('INSERT INTO purchases(id,user_id,total_amount,payment_method) VALUES(?,?,100,?)',[10+id,id,'Ficticio']);
 await exec(b.db,"INSERT INTO products(id,name,price,category,gender) VALUES(1,'Fixture',100,'Demo','mujer');INSERT INTO stock(product_id,quantity) VALUES(1,20);INSERT INTO cart(user_id,product_id,quantity) VALUES(1,1,1)");
 for(const [id,user,def]of [[1,1,1],[2,2,1],[3,1,0],[4,3,1],[5,4,1]])await b.access.runQuery('INSERT INTO payment_methods(id,user_id,card_type,card_last_four,card_holder_name,expiry_month,expiry_year,is_default) VALUES(?,?,?,?,?,?,?,?)',[id,user,'Ficticio','0000',marker,'01','30',def]);
 return b;
}
async function state(b){const result={};for(const table of ['encuestas','bitacora','payment_methods','purchases','purchase_items','stock','cart','ventas','stock_movements','invoices','shipments','shipment_status_history'])result[table]=await b.access.getAll('SELECT * FROM '+table+' ORDER BY rowid');return result;}
const payment={identificacion:'FICTICIA',cartItems:[{product_id:1,quantity:1}],useExistingCard:true};
function safe(b,result){assert.doesNotMatch(result.text,new RegExp(marker));assert.doesNotMatch(b.logs(),new RegExp(marker));assert.doesNotMatch(result.text,/SQLITE_|SELECT | at .*\.js/);}

test('RF-05 original association: foreign purchase rejected without survey or audit writes',async t=>{
 const b=await setup(t),token=await b.login(2),before=await state(b);
 const result=await b.request('/api/support/encuestas',{token,method:'POST',body:{purchase_id:11,puntuacion:4,comentario:marker,user_id:1}});
 t.diagnostic('surveyRowsAdded='+((await b.access.getOne('SELECT count(*) n FROM encuestas')).n-before.encuestas.length));
 assert.equal(result.status,404);safe(b,result);assert.deepEqual(await state(b),before);
});
test('RF-05 original legacy read: contaminated survey cannot disclose foreign purchase',async t=>{
 const b=await setup(t),token=await b.login(1);
 await b.access.runQuery('INSERT INTO encuestas(user_id,purchase_id,puntuacion,comentario) VALUES(1,12,4,?)',[marker]);
 const result=await b.request('/api/support/encuestas',{token});assert.equal(result.status,200);t.diagnostic('foreignTotalVisible='+result.data.encuestas.some(e=>e.compra_total===987654.75));assert.deepEqual(result.data.encuestas,[]);assert.doesNotMatch(result.text,/987654|PRIVATE_P0_FIXTURE/);
});
test('RF-10 original default: foreign card cannot clear own default or return success',async t=>{
 const b=await setup(t),token=await b.login(1),before=await state(b);
 const result=await b.request('/api/payment-methods/2/default',{token,method:'PUT',body:{}});t.diagnostic('ownDefaultCleared='+((await b.access.getOne('SELECT is_default FROM payment_methods WHERE id=1')).is_default===0));assert.equal(result.status,404);safe(b,result);assert.deepEqual(await state(b),before);
});
test('RF-10 original checkout: foreign saved reference rejected before any purchase effects',async t=>{
 const b=await setup(t),token=await b.login(1),before=await state(b);
 const result=await b.request('/api/payments/process',{token,method:'POST',body:{...payment,savedCardId:2}});t.diagnostic('purchasesAdded='+((await b.access.getOne('SELECT count(*) n FROM purchases')).n-before.purchases.length));assert.equal(result.status,404);safe(b,result);assert.deepEqual(await state(b),before);
});

test('RF-05 own and unlinked surveys retain legitimate success contract',async t=>{
 const b=await setup(t),token=await b.login(1);
 for(const purchase_id of [11,null,undefined,'']){const result=await b.request('/api/support/encuestas',{token,method:'POST',body:{purchase_id,puntuacion:4,comentario:'Ficticia',user_id:2}});assert.equal(result.status,201);assert.ok(result.data.encuestaId);}
 const result=await b.request('/api/support/encuestas',{token});assert.equal(result.status,200);assert.equal(result.data.encuestas.length,4);
 const own=result.data.encuestas.find(e=>e.purchase_id===11);assert.equal(own.user_id,1);assert.equal(own.compra_id,11);assert.equal(own.compra_total,100);
 for(const e of result.data.encuestas.filter(e=>e.purchase_id===null)){assert.equal(e.compra_id,null);assert.equal(e.compra_total,null);}
 assert.equal((await b.request('/api/support/encuestas',{token:await b.login(2)})).data.encuestas.length,0);
});
test('RF-05 foreign/missing IDs share safe 404; malformed IDs never write',async t=>{
 const b=await setup(t),token=await b.login(1),before=await state(b);let reference;
 for(const purchase_id of [12,999]){const result=await b.request('/api/support/encuestas',{token,method:'POST',body:{purchase_id,puntuacion:4,comentario:marker}});assert.equal(result.status,404);safe(b,result);if(reference)assert.deepEqual(result.data,reference);reference=result.data;assert.deepEqual(await state(b),before);}
 for(const purchase_id of [0,-1,1.5,'abc',{},[],true]){const result=await b.request('/api/support/encuestas',{token,method:'POST',body:{purchase_id,puntuacion:4}});assert.equal(result.status,400);safe(b,result);assert.deepEqual(await state(b),before);}
});
test('RF-05 admin/vendor global review retained, creation remains owned by actor',async t=>{
 const b=await setup(t),client=await b.login(1);
 assert.equal((await b.request('/api/support/encuestas',{token:client,method:'POST',body:{purchase_id:11,puntuacion:4}})).status,201);
 assert.equal((await b.request('/api/support/encuestas/all',{token:client})).status,403);
 for(const id of [3,4]){const token=await b.login(id),before=await state(b);const denied=await b.request('/api/support/encuestas',{token,method:'POST',body:{purchase_id:11,puntuacion:4}});assert.equal(denied.status,404);safe(b,denied);assert.deepEqual(await state(b),before);
 assert.equal((await b.request('/api/support/encuestas',{token,method:'POST',body:{purchase_id:10+id,puntuacion:4}})).status,201);
 assert.ok((await b.request('/api/support/encuestas/all',{token})).data.encuestas.some(e=>e.user_id===1));}
});
test('RF-05 survey audit failure rolls back creation and exposes no SQL',async t=>{
 const b=await setup(t),token=await b.login(1);await exec(b.db,"CREATE TRIGGER fail_survey_audit BEFORE INSERT ON bitacora BEGIN SELECT RAISE(ABORT,'PRIVATE_P0_FIXTURE');END");const before=await state(b);
 const result=await b.request('/api/support/encuestas',{token,method:'POST',body:{purchase_id:11,puntuacion:4}});assert.equal(result.status,500);safe(b,result);assert.deepEqual(await state(b),before);
});
test('RF-10 owned default succeeds, missing/malformed targets preserve all cards',async t=>{
 const b=await setup(t),token=await b.login(1);const result=await b.request('/api/payment-methods/3/default',{token,method:'PUT',body:{}});assert.equal(result.status,200);
 assert.equal((await b.access.getOne('SELECT is_default FROM payment_methods WHERE id=3')).is_default,1);assert.equal((await b.access.getOne('SELECT is_default FROM payment_methods WHERE id=1')).is_default,0);assert.equal((await b.access.getOne('SELECT is_default FROM payment_methods WHERE id=2')).is_default,1);
 const before=await state(b);for(const [id,status]of [[2,404],[999,404],['abc',400],[0,400],[-1,400],[1.5,400]]){const denied=await b.request('/api/payment-methods/'+id+'/default',{token,method:'PUT',body:{}});assert.equal(denied.status,status);safe(b,denied);assert.deepEqual(await state(b),before);}
});
test('RF-10 target update failure rolls back clearing the previous default',async t=>{
 const b=await setup(t),token=await b.login(1);await exec(b.db,"CREATE TRIGGER fail_card_target BEFORE UPDATE ON payment_methods WHEN NEW.id=3 AND NEW.is_default=1 BEGIN SELECT RAISE(ABORT,'PRIVATE_P0_FIXTURE');END");const before=await state(b);
 const result=await b.request('/api/payment-methods/3/default',{token,method:'PUT',body:{}});assert.equal(result.status,500);safe(b,result);assert.deepEqual(await state(b),before);
});
test('RF-10 checkout missing or malformed references cannot fall back to supplied card fields',async t=>{
 const b=await setup(t),token=await b.login(1),before=await state(b);
 for(const [savedCardId,status]of [[999,404],[null,400],[undefined,400],[0,400],[-1,400],['abc',400],[{},400],[[],400],[true,400]]){const denied=await b.request('/api/payments/process',{token,method:'POST',body:{...payment,savedCardId,cardName:marker,cardNumber:'0000',expiryDate:'01/30'}});assert.equal(denied.status,status);safe(b,denied);assert.deepEqual(await state(b),before);}
});
test('RF-10 owned saved card still completes academic checkout unchanged',async t=>{
 const b=await setup(t),token=await b.login(1);
 const result=await b.request('/api/payments/process',{token,method:'POST',body:{...payment,savedCardId:'1'}});assert.equal(result.status,200);assert.equal(result.data.success,true);assert.equal(result.data.paymentStatus,'simulated');
 assert.equal((await b.access.getOne('SELECT total_amount FROM purchases WHERE id=?',[result.data.purchaseId])).total_amount,3100);
 assert.equal((await b.access.getOne('SELECT quantity FROM stock WHERE product_id=1')).quantity,19);assert.equal((await b.access.getOne('SELECT count(*) n FROM cart WHERE user_id=1')).n,0);assert.doesNotMatch(b.logs(),new RegExp(marker));
});
test('RF-10 admin/vendor cannot use privileged role to manipulate another account card',async t=>{
 const b=await setup(t);for(const id of [3,4]){const token=await b.login(id),before=await state(b);
 const def=await b.request('/api/payment-methods/1/default',{token,method:'PUT',body:{}});assert.equal(def.status,404);safe(b,def);
 const checkout=await b.request('/api/payments/process',{token,method:'POST',body:{...payment,savedCardId:1}});assert.equal(checkout.status,404);safe(b,checkout);assert.deepEqual(await state(b),before);
 assert.equal((await b.request('/api/payment-methods/'+(id+1)+'/default',{token,method:'PUT',body:{}})).status,200);
 }
});
