const crypto=require('node:crypto');
const {createDatabaseAccess}=require('../config/sqliteOperations');
const {HttpError}=require('../utils/httpErrors');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function requireSecret(){const secret=process.env.BB_CHECKOUT_HASH_SECRET;if(typeof secret!=='string'||Buffer.byteLength(secret)<32)throw new Error('Checkout fingerprint configuration unavailable');return secret;}
function validateKey(key){if(key===undefined||key===null||key==='')throw new HttpError('IDEMPOTENCY_KEY_REQUIRED');if(typeof key!=='string'||!uuid.test(key))throw new HttpError('IDEMPOTENCY_KEY_INVALID');return key.toLowerCase();}
function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>[k,canonical(value[k])]));
 return value;
}
function fingerprint(body){if(!body||typeof body!=='object'||Array.isArray(body))throw new HttpError('INVALID_BODY');return crypto.createHmac('sha256',requireSecret()).update('checkout:v1:'+JSON.stringify(canonical(body))).digest('hex');}
const busy=error=>error?.code==='SQLITE_BUSY'||error?.code==='SQLITE_LOCKED';
function coordinator(db){
 const access=createDatabaseAccess(db);
 async function perform(work){try{return await access.withTransaction(work);}catch(error){if(busy(error))throw new HttpError('CHECKOUT_BUSY');throw error;}}
 async function execute({userId,key,body,work}){
  key=validateKey(key);const hash=fingerprint(body);
  await perform(async tx=>{
   await tx.runQuery('INSERT OR IGNORE INTO checkout_requests(user_id,idempotency_key,request_hash) VALUES(?,?,?)',[userId,key,hash]);
   const row=await tx.getOne('SELECT request_hash FROM checkout_requests WHERE user_id=? AND idempotency_key=?',[userId,key]);
   if(!row||row.request_hash!==hash)throw new HttpError('IDEMPOTENCY_KEY_CONFLICT');
  });
  return perform(async tx=>{
   const row=await tx.getOne('SELECT * FROM checkout_requests WHERE user_id=? AND idempotency_key=?',[userId,key]);
   if(!row||row.request_hash!==hash)throw new HttpError('IDEMPOTENCY_KEY_CONFLICT');
   if(row.state==='committed')return{replayed:true,response:JSON.parse(row.response_json)};
   const purchase=await work(tx);
   const plan=await tx.getOne('SELECT purchase_id FROM checkout_effects WHERE purchase_id=?',[purchase.purchaseId]);
   const invoice=await tx.getOne('SELECT id FROM invoices WHERE id=? AND purchase_id=? AND user_id=?',[purchase.invoiceId,purchase.purchaseId,userId]);
   if(!plan||!invoice)throw new HttpError('INTERNAL_ERROR');
   const response={success:true,message:'Compra simulada registrada; no se realizó un cobro',paymentStatus:'simulated',purchaseId:purchase.purchaseId,invoiceId:purchase.invoiceId,consecutivo:purchase.consecutivo,trackingNumber:null,completion:'partial',warnings:['EFFECTS_PENDING']};
   const changed=await tx.runQuery("UPDATE checkout_requests SET state='committed',purchase_id=?,response_status=200,response_json=? WHERE user_id=? AND idempotency_key=? AND state='ready'",[purchase.purchaseId,JSON.stringify(response),userId,key]);
   if(changed.changes!==1)throw new HttpError('INTERNAL_ERROR');
   return{replayed:false,response};
  });
 }
 async function status(userId,key){
  key=validateKey(key);const row=await access.getOne("SELECT purchase_id,response_json FROM checkout_requests WHERE user_id=? AND idempotency_key=? AND state='committed'",[userId,key]);
  if(!row)throw new HttpError('RESOURCE_NOT_FOUND');
  const effects=await access.getOne('SELECT save_method,shipment,invoice_files,shipping_email,invoice_email FROM checkout_effects WHERE purchase_id=?',[row.purchase_id]);
  if(!effects)throw new HttpError('INTERNAL_ERROR');
  const shipment=await access.getOne('SELECT tracking_number FROM shipments WHERE purchase_id=?',[row.purchase_id]);
  // A persisted running effect has unknown outcome; never re-execute it on replay.
  const states=Object.fromEntries(Object.entries(effects).map(([k,v])=>[k,v==='running'?'unknown':v]));
  const complete=Object.values(states).every(s=>s==='succeeded'||s==='not_required');
  return{success:true,confirmation:JSON.parse(row.response_json),effects:states,completion:complete?'complete':'partial',trackingNumber:shipment?.tracking_number||null};
 }
 return{execute,status};
}
module.exports={coordinator,validateKey,fingerprint,canonical,requireSecret};
