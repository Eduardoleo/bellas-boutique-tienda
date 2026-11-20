const fs=require('node:fs/promises'),syncFs=require('node:fs'),path=require('node:path'),os=require('node:os');
const sourceRoot=path.resolve(__dirname,'../..');
function fail(){throw new Error('Destino demo no válido: se exige SQLite nuevo y explícito en un directorio temporal boutique-demo-UUID.');}
function target(file=process.env.BB_SQLITE_PATH){
 if(typeof file!=='string'||!path.isAbsolute(file)||file.includes('\0'))fail();
 const absolute=path.resolve(file),root=path.dirname(absolute),temp=syncFs.realpathSync(os.tmpdir());
 if(absolute!==file||path.basename(absolute)!=='demo.sqlite'||!/^boutique-demo-[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(path.basename(root))||path.dirname(root)!==temp)fail();
 return{file:absolute,root,temp};
}
async function readEnvironment(file,{allowSeeded=false}={}){
 const resolved=target(file);const stat=await fs.lstat(resolved.root);if(!stat.isDirectory()||stat.isSymbolicLink()||await fs.realpath(resolved.root)!==resolved.root)fail();
 for(const name of ['demo.sqlite','demo.json','demo-private.json','runtime']){const s=await fs.lstat(path.join(resolved.root,name));if(s.isSymbolicLink()||(name!=='runtime'&&(!s.isFile()||s.nlink!==1)))fail();}
 const marker=JSON.parse(await fs.readFile(path.join(resolved.root,'demo.json'),'utf8'));if(marker.kind!=='boutique-demo-v1'||!(marker.state==='ready'||allowSeeded&&marker.state==='seeded'))fail();
 if(JSON.stringify(marker.identity)!==JSON.stringify(await identity(resolved.file)))fail();
 const privateData=JSON.parse(await fs.readFile(path.join(resolved.root,'demo-private.json'),'utf8'));if(!/^[a-f0-9]{64}$/.test(privateData.jwt)||!/^[a-f0-9]{64}$/.test(privateData.hmac))fail();
 return{...resolved,privateData,runtime:path.join(resolved.root,'runtime')};
}
async function copyTree(from,to,extensions){
 await fs.mkdir(to,{recursive:true});for(const entry of await fs.readdir(from,{withFileTypes:true})){if(entry.name.startsWith('.')||['node_modules','invoices','dist'].includes(entry.name))continue;if(entry.isSymbolicLink())fail();const a=path.join(from,entry.name),b=path.join(to,entry.name);if(entry.isDirectory())await copyTree(a,b,extensions);else if(entry.isFile()&&extensions.includes(path.extname(entry.name)))await fs.copyFile(a,b);}
}
async function snapshot(root){
 const runtime=path.join(root,'runtime');await fs.mkdir(path.join(runtime,'server/database'),{recursive:true});await fs.mkdir(path.join(runtime,'client'),{recursive:true});
 for(const name of ['server.js','package.json','package-lock.json'])await fs.copyFile(path.join(sourceRoot,'server',name),path.join(runtime,'server',name));
 await fs.copyFile(path.join(sourceRoot,'server/database/schema.sql'),path.join(runtime,'server/database/schema.sql'));
 await copyTree(path.join(sourceRoot,'server/src'),path.join(runtime,'server/src'),['.js','.ttf','.txt']);
 for(const name of ['index.html','vite.config.js','package.json','package-lock.json'])await fs.copyFile(path.join(sourceRoot,'client',name),path.join(runtime,'client',name));
 await copyTree(path.join(sourceRoot,'client/src'),path.join(runtime,'client/src'),['.js','.jsx','.css','.svg','.png','.jpg','.jpeg','.webp','.gif','.woff','.woff2']);
 await copyTree(path.join(sourceRoot,'client/public'),path.join(runtime,'client/public'),['.svg','.png','.jpg','.jpeg','.webp','.ico']);
 for(const part of ['server','client'])await fs.symlink(path.join(sourceRoot,part,'node_modules'),path.join(runtime,part,'node_modules'),process.platform==='win32'?'junction':'dir');
 return runtime;
}
function port(value,fallback){const result=value===undefined?fallback:Number(value);if(!Number.isInteger(result)||result<0||result>65535)throw new Error('Puerto demo inválido.');return result;}
async function identity(file){const s=await fs.stat(file,{bigint:true});return{dev:String(s.dev),ino:String(s.ino),birth:String(s.birthtimeNs)};}
module.exports={target,readEnvironment,snapshot,sourceRoot,port,identity};
