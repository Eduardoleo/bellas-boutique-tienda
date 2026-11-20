const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
async function search(){const source=await fs.readFile(path.resolve(__dirname,'../../client/src/utils/catalogSearch.js'),'utf8');return(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).searchCatalog}
test('PEND01 searches public catalogue names case-insensitively and trims accidental spaces',async()=>{const find=await search();assert.deepEqual(find([[{id:1,name:'Vestido Aurora'}],[{id:2,name:'Camisa Horizonte'}]],'  aUrOrA  ').map(p=>p.id),[1]);});
test('PEND01 no matches and empty search do not show all products or match private descriptions',async()=>{const find=await search(),products=[[{id:1,name:'Vestido',description:'Aurora'}]];for(const query of ['Aurora','','   ',null])assert.deepEqual(find(products,query),[]);});
test('PEND01 deduplicates catalogue results and ignores malformed entries',async()=>{const find=await search(),p={id:1,name:'Aurora'};assert.deepEqual(find([[p,null,{id:2}],[p]],'aurora'),[p]);});
test('PEND03 chat writes and read states retain resource ownership and both support roles',async t=>{
 const {fixture}=require('./p0Fixture.cjs'),b=await fixture(t),client=await b.login(1),other=await b.login(2),admin=await b.login(3),vendor=await b.login(4),room='fixture_room_1';
 const send=(token,message)=>b.request('/api/support/chat/mensaje',{token,method:'POST',body:{sala_id:room,mensaje:message}});
 assert.equal((await send(client,'Consulta ficticia 3C')).status,201);assert.equal((await send(admin,'Respuesta ficticia administrador')).status,201);assert.equal((await send(vendor,'Respuesta ficticia vendedor')).status,201);
 const before=(await b.access.getOne('SELECT count(*) n FROM mensajes_chat WHERE sala_id=?',[room])).n;
 assert.equal((await send(other,'No debe insertarse')).status,404);assert.equal((await b.request('/api/support/chat/'+room+'/leer',{token:other,method:'PUT',body:{}})).status,404);assert.equal((await b.request('/api/support/chat/'+room+'/mensajes',{token:other})).status,404);assert.equal((await b.request('/api/support/chat/salas',{token:other})).data.salas.some(s=>s.sala_id===room),false);
 assert.equal((await b.access.getOne('SELECT count(*) n FROM mensajes_chat WHERE sala_id=?',[room])).n,before);assert.equal((await b.request('/api/support/chat/'+room+'/leer',{token:admin,method:'PUT',body:{}})).status,200);assert.equal((await b.request('/api/support/chat/'+room+'/leer',{token:vendor,method:'PUT',body:{}})).status,200);assert.equal((await b.request('/api/users/all',{token:vendor})).status,403);
});

function limiterRequest(limiter, req={ip:'synthetic-ip',body:{}}) {
  let status=200,body,passed=false;
  limiter(req,{status(value){status=value;return this},json(value){body=value;return this}},()=>{passed=true});
  return {status,body,passed};
}
test('PEND03 limiter instances keep independent budgets and unchanged denial response',()=>{
 const {rateLimiter}=require('../src/middleware/validationMiddleware'),global=rateLimiter(5,60000),auth=rateLimiter(2,60000);
 for(let n=0;n<3;n++)assert.equal(limiterRequest(global).passed,true);
 for(let n=0;n<2;n++)assert.equal(limiterRequest(auth).passed,true);
 assert.deepEqual(limiterRequest(auth),{status:429,body:{success:false,message:'Demasiadas solicitudes. Por favor, intente más tarde.'},passed:false});
 assert.equal(limiterRequest(global).passed,true);assert.equal(limiterRequest(global).passed,true);assert.equal(limiterRequest(global).status,429);
});
test('PEND03 limiter preserves independent IP email identities',()=>{
 const {rateLimiter}=require('../src/middleware/validationMiddleware'),limited=rateLimiter(1,60000);
 assert.equal(limiterRequest(limited,{ip:'fixture-a',body:{email:'a@example.test'}}).passed,true);
 assert.equal(limiterRequest(limited,{ip:'fixture-a',body:{email:'b@example.test'}}).passed,true);
 assert.equal(limiterRequest(limited,{ip:'fixture-b',body:{email:'a@example.test'}}).passed,true);
 assert.equal(limiterRequest(limited,{ip:'fixture-a',body:{email:'a@example.test'}}).status,429);
});
test('PEND03 limiter preserves the configured window expiration',t=>{
 const previous=Date.now;let now=1000;Date.now=()=>now;t.after(()=>{Date.now=previous});
 const {rateLimiter}=require('../src/middleware/validationMiddleware'),limited=rateLimiter(1,1000);
 assert.equal(limiterRequest(limited).passed,true);now=2000;assert.equal(limiterRequest(limited).status,429);now=2001;assert.equal(limiterRequest(limited).passed,true);
});
test('PEND03 recovery after catalogue traffic works and auth still limits at 30',async t=>{
 const {fixture}=require('./p0Fixture.cjs'),b=await fixture(t,{localRecovery:true});
 for(let n=0;n<31;n++)assert.equal((await b.request('/api/catalog/women')).status,200);
 const options={method:'POST',body:{token:'a'.repeat(64),password:'Fixture123!'}};
 for(let n=0;n<30;n++)assert.equal((await b.request('/api/auth/reset-password',options)).status,400);
 assert.equal((await b.request('/api/auth/reset-password',options)).status,429);
});
test('PEND03 global HTTP rate limit remains 150 requests per minute',async t=>{
 const {fixture}=require('./p0Fixture.cjs'),b=await fixture(t);
 for(let n=0;n<150;n++)assert.equal((await b.request('/api/catalog/women')).status,200);
 assert.equal((await b.request('/api/catalog/women')).status,429);
});
