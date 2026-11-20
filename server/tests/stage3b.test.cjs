const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {fixture}=require('./p0Fixture.cjs');
test('DEF03 overlong registration phone is rejected independently and valid optional contacts persist',async t=>{
 const b=await fixture(t),base={name:'Synthetic',email:'contact@example.test',password:'Fixture123!'};
 assert.equal((await b.request('/api/auth/register',{method:'POST',body:{...base,phone:'1'.repeat(60)}})).status,400);
 assert.equal((await b.request('/api/auth/register',{method:'POST',body:{...base,cedula:'1-2345-6789',phone:'+50612345678'}})).status,201);
 const row=await b.access.getOne('SELECT cedula,phone FROM users WHERE email=?',[base.email]);assert.equal(row.cedula,'1-2345-6789');assert.equal(row.phone,'+50612345678');
});
test('DEF01 and DEF03 reject invalid contact fields through registration and profile HTTP without writes',async t=>{
 const b=await fixture(t),token=await b.login(1),before=await b.access.getOne('SELECT count(*) n FROM users');
 for(const patch of [{cedula:'1'.repeat(60)},{cedula:'<script>'},{cedula:123456789},{cedula:'--'},{phone:'1'.repeat(60)},{phone:'call me'},{phone:{value:'12345678'}}]){
  const result=await b.request('/api/auth/register',{method:'POST',body:{name:'Synthetic',email:'new@example.test',password:'Fixture123!',...patch}});assert.equal(result.status,400);assert.doesNotMatch(result.text,/script>|SQLITE|stack/);
 }
 assert.deepEqual(await b.access.getOne('SELECT count(*) n FROM users'),before);
 for(const phone of ['1'.repeat(60),'invalid']){assert.equal((await b.request('/api/users/update',{token,method:'PUT',body:{name:'Synthetic',email:'fixture1@example.test',phone,address:'Demo'}})).status,400)}
 for(const phone of ['1234-5678','+50612345678',''])assert.equal((await b.request('/api/users/update',{token,method:'PUT',body:{name:'Synthetic',email:'fixture1@example.test',phone,address:'Demo'}})).status,200);
});
test('DEF01 rejects identification before new invoices purchase or stock writes',async t=>{
 const b=await fixture(t),token=await b.login(1);await b.access.runQuery("INSERT INTO products(id,name,price,category,gender) VALUES(1,'Ficticio',18500,'Demo','mujer')");await b.access.runQuery('INSERT INTO stock(product_id,quantity) VALUES(1,10)');
 for(const identificacion of ['',null,'1'.repeat(60),'123','<bad>',{},'   '])assert.equal((await b.request('/api/payments/process',{token,method:'POST',body:{identificacion,cartItems:[{product_id:1,quantity:1}]}})).status,400);
 assert.equal((await b.access.getOne('SELECT count(*) n FROM invoices')).n,0);assert.equal((await b.access.getOne('SELECT quantity FROM stock')).quantity,10);
});
test('DEF01 DEF03 identical frontend/backend bounded rules preserve optional contacts and supported references',async()=>{
 const backend=require('../src/utils/contactValidation'),source=await fs.readFile(path.resolve(__dirname,'../../client/src/utils/contactValidation.js'),'utf8'),front=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 for(const [value,valid]of [[undefined,true],['',true],['123456789',true],['1-2345-6789',true],['123456789012',true],['DEMO-SIN-VALOR',true],['PASSPORT123',true],['1'.repeat(21),false],['abc<script>',false],[{},false],['123',false],[' abc ',false]]){assert.equal(backend.validIdentification(value),valid);assert.equal(front.validIdentification(value),valid)}
 assert.equal(backend.validIdentification('',{required:true}),false);
 for(const [value,valid]of [['',true],['12345678',true],['1234-5678',true],['+34912345678',true],['1'.repeat(25),false],['+012345678',false],['1234567',false],[12345678,false]]){assert.equal(backend.validPhone(value),valid);assert.equal(front.validPhone(value),valid)}
});
test('DEF02 embeds a licensed Unicode font and leaves invoice XML numeric structure unchanged',async()=>{
 const font=require('fontkit').openSync(path.resolve(__dirname,'../src/assets/fonts/NotoSans.ttf'));assert.notEqual(font.glyphForCodePoint(0x20a1).id,0);
 const source=await fs.readFile(path.resolve(__dirname,'../src/controllers/paymentController.js'),'utf8');assert.match(source,/currencyFont/);assert.match(source,/maximumFractionDigits: 2/);assert.match(source,/sin validación de Hacienda/);
});
test('DEF02 new simulated PDF/XML preserve totals ownership and accepted identification',async t=>{
 const b=await fixture(t),token=await b.login(1),other=await b.login(2);await b.access.runQuery("UPDATE users SET phone='00000000' WHERE id=1");await b.access.runQuery("INSERT INTO products(id,name,price,category,gender) VALUES(1,'Producto ficticio',18500,'Demo','mujer')");await b.access.runQuery('INSERT INTO stock(product_id,quantity) VALUES(1,5)');
 const key=require('node:crypto').randomUUID(),body={identificacion:'1-2345-6789',cartItems:[{product_id:1,quantity:1}]};const purchase=await b.request('/api/payments/process',{token,key,method:'POST',body});assert.equal(purchase.status,200);assert.equal((await b.request('/api/payments/process',{token,key,method:'POST',body})).data.purchaseId,purchase.data.purchaseId);
 let row;for(let i=0;i<200;i++){row=await b.access.getOne('SELECT * FROM invoices');if(row?.pdf_path&&row?.xml_path)break;await new Promise(r=>setTimeout(r,20))}assert.ok(row.pdf_path&&row.xml_path);t.after(async()=>{await fs.unlink(row.pdf_path);await fs.unlink(row.xml_path)});
 assert.equal(row.cliente_identificacion,body.identificacion);assert.equal(row.total,21500);assert.equal(row.envio,3000);assert.equal(row.monto_con_iva,18500);assert.equal(Math.round(row.monto_sin_iva*100)/100,16371.68);assert.equal(Math.round((row.monto_con_iva-row.monto_sin_iva)*100)/100,2128.32);
 const xml=await fs.readFile(row.xml_path,'utf8');for(const amount of ['16371.68','2128.32','18500.00','3000.00','21500.00'])assert.ok(xml.includes(amount));const pdf=await fs.readFile(row.pdf_path);assert.ok(pdf.subarray(0,4).equals(Buffer.from('%PDF')));assert.match(pdf.toString('latin1'),/FontFile2/);
 for(const ext of ['pdf','xml']){assert.equal((await b.request('/api/users/invoice/factura_'+row.consecutivo+'.'+ext,{token})).status,200);assert.equal((await b.request('/api/users/invoice/factura_'+row.consecutivo+'.'+ext,{token:other})).status,404)}assert.equal((await b.access.getOne('SELECT quantity FROM stock')).quantity,4);
 if(process.env.BB_QA_EVIDENCE_DIR){const dir=path.resolve(process.env.BB_QA_EVIDENCE_DIR),temp=path.resolve(require('node:os').tmpdir());assert.ok(dir.startsWith(temp+path.sep));await fs.mkdir(dir,{recursive:true});await fs.copyFile(row.pdf_path,path.join(dir,'corrected-invoice.pdf'));await fs.copyFile(row.xml_path,path.join(dir,'corrected-invoice.xml'));}
});
