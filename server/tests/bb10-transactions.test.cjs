const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sqlite3 = require('sqlite3');
const { createDatabaseAccess, withTransaction, TransactionError } = require('../src/config/sqliteOperations');
const { createRecovery } = require('../src/services/recoveryService');
const marker='PRIVATE_TRANSACTION_TOKEN_PASSWORD';
const exec=(db,sql)=>new Promise((resolve,reject)=>db.exec(sql,error=>error?reject(error):resolve()));
async function fixture(t, full=false) {
  const db=new sqlite3.Database(':memory:'); t.after(()=>new Promise(resolve=>db.close(resolve)));
  await exec(db,'PRAGMA foreign_keys=ON');
  if(full) await exec(db,fs.readFileSync(path.join(__dirname,'../database/schema.sql'),'utf8'));
  return {db,access:createDatabaseAccess(db)};
}
function model(t,name,access) {
  const config=require.resolve('../src/config/db'); const previous=require.cache[config];
  require.cache[config]={id:config,filename:config,loaded:true,exports:access};
  const id=require.resolve('../src/models/'+name); delete require.cache[id]; const result=require(id);
  t.after(()=>{delete require.cache[id];if(previous)require.cache[config]=previous;else delete require.cache[config]});return result;
}

test('BB-10 transaction statement failure rolls back earlier writes before rejecting',async t=>{
  const {db,access}=await fixture(t);await exec(db,'CREATE TABLE records(id INTEGER PRIMARY KEY,value TEXT)');
  await assert.rejects(access.runTransaction([{query:'INSERT INTO records VALUES (?,?)',params:[1,'fixture']},{query:'INSERT INTO absent VALUES (?)',params:[marker]}]));
  assert.equal((await access.getOne('SELECT count(*) n FROM records')).n,0);
  assert.equal((await access.runQuery('INSERT INTO records VALUES (2,?)',['after rollback'])).changes,1);
});

test('BB-10 deferred COMMIT failure is rolled back and the connection remains usable',async t=>{
  const {db,access}=await fixture(t);await exec(db,'CREATE TABLE parent(id PRIMARY KEY);CREATE TABLE child(parent_id REFERENCES parent(id) DEFERRABLE INITIALLY DEFERRED)');
  await assert.rejects(access.withTransaction(tx=>tx.runQuery('INSERT INTO child VALUES (?)',[999])),{code:'SQLITE_CONSTRAINT'});
  assert.equal((await access.getOne('SELECT count(*) n FROM child')).n,0);
  await access.withTransaction(async tx=>{await tx.runQuery('INSERT INTO parent VALUES (1)');await tx.runQuery('INSERT INTO child VALUES (1)')});
  assert.equal((await access.getOne('SELECT count(*) n FROM child')).n,1);
});

test('BB-10 failed BEGIN never issues ROLLBACK against a different transaction',async()=>{
  const calls=[];const db={run(sql,params,callback){calls.push(sql);setImmediate(()=>callback(Object.assign(new Error(marker),{code:'SQLITE_BUSY'})))}};
  await assert.rejects(withTransaction(db,()=>{throw new Error('work must not run')}),{code:'SQLITE_BUSY'});
  assert.deepEqual(calls,['BEGIN IMMEDIATE']);
});

test('BB-10 COMMIT failure waits for rollback completion before rejection',async()=>{
  const calls=[];let rolledBack=false;const db={run(sql,params,callback){calls.push(sql);if(sql==='COMMIT')setImmediate(()=>callback(new Error(marker)));else if(sql==='ROLLBACK')setTimeout(()=>{rolledBack=true;callback.call({changes:0})},20);else setImmediate(()=>callback.call({changes:0}))}};
  await assert.rejects(withTransaction(db,async()=>1));assert.equal(rolledBack,true);assert.deepEqual(calls,['BEGIN IMMEDIATE','COMMIT','ROLLBACK']);
});

test('BB-10 rollback failure is explicit and quarantines subsequent operations',async()=>{
  const calls=[];const db={run(sql,params,callback){calls.push(sql);setImmediate(()=>callback.call({changes:0},sql==='COMMIT'||sql==='ROLLBACK'?new Error(marker):null))}};
  const access=createDatabaseAccess(db);
  await assert.rejects(access.withTransaction(async()=>1),e=>e instanceof TransactionError&&e.rollbackFailed===true);
  await assert.rejects(access.runQuery('INSERT SHOULD NOT RUN'),TransactionError);
  assert.deepEqual(calls,['BEGIN IMMEDIATE','COMMIT','ROLLBACK']);
});

test('BB-10 ordinary queries cannot interleave into another operation transaction',async t=>{
  const {db,access}=await fixture(t);await exec(db,'CREATE TABLE records(id PRIMARY KEY)');
  let release,entered;const gate=new Promise(resolve=>{release=resolve});const entry=new Promise(resolve=>{entered=resolve});
  const transaction=access.withTransaction(async tx=>{await tx.runQuery('INSERT INTO records VALUES(1)');entered();await gate;assert.equal((await tx.getOne('SELECT count(*) n FROM records')).n,1)});
  await entry;const outside=access.runQuery('INSERT INTO records VALUES(2)');release();await Promise.all([transaction,outside]);
  assert.equal((await access.getOne('SELECT count(*) n FROM records')).n,2);
});

test('BB-10 canonical checkout rolls back partial purchase when stock write fails',async t=>{
 const {db,access}=await fixture(t,true);
 await exec(db,"INSERT INTO users(id,name,email,password) VALUES(1,'Fixture','fixture@example.test','synthetic');INSERT INTO products(id,name,price,category,gender) VALUES(1,'Fixture',100,'Demo','mujer');INSERT INTO stock(product_id,quantity) VALUES(1,1);INSERT INTO cart(user_id,product_id,quantity) VALUES(1,1,2);CREATE TRIGGER fail_checkout_stock BEFORE UPDATE ON stock BEGIN SELECT RAISE(ABORT,'PRIVATE_FIXTURE');END");
 const id=require.resolve('../src/config/db'),old=require.cache[id];require.cache[id]={id,filename:id,loaded:true,exports:{db,...access}};
 const controllerId=require.resolve('../src/controllers/paymentController');delete require.cache[controllerId];
 t.after(()=>{old?require.cache[id]=old:delete require.cache[id];delete require.cache[controllerId];});
 process.env.BB_CHECKOUT_HASH_SECRET='synthetic-checkout-fingerprint-key-32';
 const {processPayment}=require(controllerId);let status;await processPayment({userId:1,headers:{'idempotency-key':require('node:crypto').randomUUID()},body:{identificacion:'FICTICIA',cartItems:[{product_id:1,quantity:1}]}},{status(n){status=n;return this},json(){return this}});assert.equal(status,500);
 assert.equal((await access.getOne('SELECT count(*) n FROM purchases')).n,0);assert.equal((await access.getOne('SELECT count(*) n FROM purchase_items')).n,0);assert.equal((await access.getOne('SELECT quantity FROM stock')).quantity,1);assert.equal((await access.getOne('SELECT count(*) n FROM cart')).n,1);
});

test('BB-10 product creation rolls back if its stock insert fails',async t=>{
  const {db,access}=await fixture(t,true);await exec(db,"CREATE TRIGGER fail_stock BEFORE INSERT ON stock BEGIN SELECT RAISE(ABORT,'"+marker+"');END");
  const Catalog=model(t,'catalogModel',access);await assert.rejects(Catalog.createProduct({name:'Fixture',description:'Fixture',price:100,category:'Demo',gender:'mujer'}));
  assert.equal((await access.getOne('SELECT count(*) n FROM products')).n,0);
});

test('BB-10 failed session insert preserves the previous active session',async t=>{
  const {db,access}=await fixture(t,true);await exec(db,"INSERT INTO users(id,name,email,password) VALUES(1,'Fixture','fixture@example.test','synthetic');INSERT INTO sesiones(user_id,token) VALUES(1,'old-fixture');CREATE TRIGGER fail_session BEFORE INSERT ON sesiones BEGIN SELECT RAISE(ABORT,'"+marker+"');END");
  const Users=model(t,'usersModel',access);await assert.rejects(Users.registrarSesion(1,marker,'127.0.0.1','fixture'));
  assert.equal((await access.getOne('SELECT activa FROM sesiones WHERE token=?',['old-fixture'])).activa,1);assert.equal((await access.getOne('SELECT count(*) n FROM sesiones')).n,1);
});

test('BB-10 recovery failure rolls back token consumption and password change',async t=>{
  const {db,access}=await fixture(t);await exec(db,"CREATE TABLE users(id INTEGER PRIMARY KEY,email TEXT,password TEXT);INSERT INTO users VALUES(1,'fixture@example.test','unchanged')");
  let token;const recovery=createRecovery({db,deliver:async(_,value)=>{token=value}});await recovery.request('fixture@example.test');await recovery.waitForDeliveries();
  await exec(db,"CREATE TRIGGER fail_password BEFORE UPDATE OF password ON users BEGIN SELECT RAISE(ABORT,'"+marker+"');END");
  await assert.rejects(recovery.reset(token,'Fixture123!'));
  assert.equal((await access.getOne('SELECT used FROM portfolio_password_resets')).used,0);assert.equal((await access.getOne('SELECT password FROM users')).password,'unchanged');
});

test('BB-10 failed recovery delivery is logged privately and its token is removed',async t=>{
  const {db,access}=await fixture(t);await exec(db,"CREATE TABLE users(id INTEGER PRIMARY KEY,email TEXT,password TEXT);INSERT INTO users VALUES(1,'fixture@example.test','unchanged')");
  const recovery=createRecovery({db,deliver:async()=>{throw new TypeError(marker)}});assert.equal(await recovery.request('fixture@example.test'),require('../src/services/recoveryService').generic);await recovery.waitForDeliveries();
  assert.equal((await access.getOne('SELECT count(*) n FROM portfolio_password_resets')).n,0);
});

test('BB-10 nested model operations join the outer transaction and roll back together',async t=>{
  const {db,access}=await fixture(t);await exec(db,'CREATE TABLE records(id PRIMARY KEY)');
  await assert.rejects(access.withTransaction(async()=>{
    await access.runQuery('INSERT INTO records VALUES(1)');
    await access.withTransaction(async()=>{await access.runQuery('INSERT INTO records VALUES(2)')});
    throw new Error(marker);
  }));
  assert.equal((await access.getOne('SELECT count(*) n FROM records')).n,0);
});
