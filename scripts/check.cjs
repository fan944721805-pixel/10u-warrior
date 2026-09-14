// Check maintained service code and the exact client assets shipped by Web/Android.
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {allowed} = require('../client-assets.cjs');
const root = path.resolve(__dirname, '..');
function scripts(directory, recursive = false) {
  return fs.readdirSync(path.join(root, directory), {withFileTypes:true}).flatMap(entry => {
    const file = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) return recursive ? scripts(file, true) : [];
    return entry.isFile() && /\.(?:c?js|mjs)$/.test(file) ? [file] : [];
  });
}
const files = [...scripts(''), ...scripts('mobile', true), ...scripts('scripts'),
  ...scripts('public', true).filter(file => allowed(file.slice(7), {native:true}))];
async function check(file) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--check', file], {cwd:root, stdio:'inherit', windowsHide:true});
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`Syntax check failed: ${file}`)));
  });
}
(async () => {
  let next = 0;
  await Promise.all(Array.from({length:4}, async () => {
    while (next < files.length) await check(files[next++]);
  }));
  console.log(`PASS: ${files.length} service, build and shipped client scripts`);
})().catch(error => {console.error(error.message); process.exitCode = 1;});
