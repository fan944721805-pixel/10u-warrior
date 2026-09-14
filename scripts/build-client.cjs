const fs=require('node:fs'),path=require('node:path');
const {allowed}=require('../client-assets.cjs');
const root=path.resolve(__dirname,'..');
function buildClient({native=false}={}){
 const artifacts=path.join(root,'artifacts'),output=path.resolve(artifacts,native?'mobile-web':'web-client');
 // Verify the exact artifact child before removing stale distribution assets.
 if(path.dirname(output)!==artifacts||!['mobile-web','web-client'].includes(path.basename(output)))throw Error('INVALID_CLIENT_OUTPUT');
 fs.rmSync(output,{recursive:true,force:true});fs.mkdirSync(output,{recursive:true});
 function visit(directory,relative=''){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){if(entry.isSymbolicLink())continue;const name=relative+entry.name,source=path.join(directory,entry.name);if(entry.isDirectory())visit(source,name+'/');else if(allowed(name,{native})){const target=path.join(output,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);}}}
 visit(path.join(root,'public'));return output;
}
module.exports={buildClient};
if(require.main===module)console.log(buildClient({native:process.argv.includes('--native')}));
