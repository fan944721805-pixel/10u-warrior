// Node 22 and Node 24 discover .cjs files differently; enumerate the same suite.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
function find(directory){return fs.readdirSync(path.join(root,directory),{withFileTypes:true}).flatMap(entry=>{
 const file=path.join(directory,entry.name);
 return entry.isDirectory()?find(file):/\.test\.(?:cjs|js)$/.test(entry.name)?[file]:[];
});}
const files=find('test').sort();if(!files.length)throw Error('No test files found');
const result=spawnSync(process.execPath,['--test',...files],{cwd:root,stdio:'inherit',windowsHide:true});
process.exit(result.status??1);
