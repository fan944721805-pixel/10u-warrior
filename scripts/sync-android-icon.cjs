// Package the exact header artwork; Android drawables handle scaling and masking.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const publicRoot = path.join(root, 'public');
const html = fs.readFileSync(path.join(publicRoot, 'index.html'), 'utf8');
const sourceName = html.match(/<img\b[^>]*class="warrior-mark"[^>]*src="([^"]+)"/)?.[1];
if (!sourceName) throw new Error('Header brand artwork not found');
const source = path.resolve(publicRoot, sourceName);
if (!source.startsWith(publicRoot + path.sep)) throw new Error('Brand artwork must be inside public');
const png = fs.readFileSync(source);
if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || png.readUInt32BE(16) !== png.readUInt32BE(20)) {
  throw new Error('Android brand artwork must be a square PNG');
}
for (const target of ['assets/logo.png', 'android/app/src/main/res/drawable-nodpi/launcher_art.png']) {
  const destination = path.join(root, target);
  fs.mkdirSync(path.dirname(destination), {recursive:true});
  fs.copyFileSync(source, destination);
}
console.log(`Android launcher artwork synchronized: ${sourceName}`);
