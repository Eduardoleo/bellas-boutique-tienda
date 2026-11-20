const path=require('node:path');const {pathToFileURL}=require('node:url');const {readEnvironment,port}=require('./demoEnvironment');
async function start(){const demo=await readEnvironment(process.env.BB_SQLITE_PATH),api=port(process.env.BB_DEMO_API_PORT,4100),web=port(process.env.BB_DEMO_WEB_PORT,5173);if(!api||!web)throw new Error('Se requieren puertos conocidos para React.');
 for(const key of Object.keys(process.env))if(key.startsWith('VITE_'))delete process.env[key];
 process.env.VITE_API_URL='http://127.0.0.1:'+api;
 const {createServer}=await import(pathToFileURL(path.join(demo.runtime,'client/node_modules/vite/dist/node/index.js')).href);
 const csp="default-src 'self'; connect-src 'self' http://127.0.0.1:"+api+' ws://127.0.0.1:'+web+"; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";
 const server=await createServer({root:path.join(demo.runtime,'client'),cacheDir:path.join(demo.root,'vite-cache'),server:{host:'127.0.0.1',port:web,strictPort:true,headers:{'Content-Security-Policy':csp}}});await server.listen();console.log('Demo React local en http://127.0.0.1:'+web);return server;
}
if(require.main===module)start().catch(()=>{console.error('No se pudo iniciar React de demo. Revise destino y puertos.');process.exitCode=1;});module.exports={start};
