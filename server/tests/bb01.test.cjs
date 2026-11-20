// Transaction boundary is stubbed; the existing registration/role assertions are unchanged.
const dbPath=require.resolve('../src/config/db');require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{withTransaction:async work=>work({})}};
const test=require('node:test');const assert=require('node:assert/strict');
const modelPath=require.resolve('../src/models/usersModel');let stored;let clients=0;
require.cache[modelPath]={id:modelPath,filename:modelPath,loaded:true,exports:{
 createUser:async data=>{stored=data;return 1},registerClient:async()=>{clients++},registrarBitacora:async()=>{},getUserById:async()=>({rol:stored.rol})}};
const controller=require('../src/controllers/authController');
test('BB-01 public registration cannot select privileged roles',async()=>{
 for(const rol of ['Administrador','Vendedor',undefined]){let status;const res={status(n){status=n;return this},json(){return this}};
 await controller.register({body:{name:'Persona Demo',email:'persona@ejemplo.test',password:'SoloDemo123!',rol},ip:'127.0.0.1'},res);
 assert.equal(status,201);assert.equal(stored.rol,'Cliente');}assert.equal(clients,3);
});
