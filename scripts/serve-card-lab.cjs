// Read-only static server for the design prototype. No application server import.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {allowed:clientAssetAllowed}=require('../client-assets.cjs');
const publicRoot = path.resolve(__dirname, '../public');
const docsRoot = path.resolve(__dirname, '../docs/strategy-system');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8'};
function createPreviewServer() {
  return http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    let pathname; try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400); res.end(); return; }
    if (pathname === '/') { res.writeHead(302, {location:'/index.html'}); res.end(); return; }
    const docs=pathname.startsWith('/design-docs/');
    const root=docs?docsRoot:publicRoot;
    const relative=docs?pathname.slice('/design-docs/'.length):pathname.slice(1);
    const file=path.resolve(root,relative||'README.md');
    const allowed=docs?path.extname(file)==='.md':clientAssetAllowed(relative);
    if(!allowed||!file.startsWith(root+path.sep)||!types[path.extname(file)]||!fs.existsSync(file)||!fs.statSync(file).isFile()) {res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'content-type':types[path.extname(file)],'cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' wss://data-stream.binance.vision; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"});
    if(req.method==='HEAD'){res.end();return;}fs.createReadStream(file).pipe(res);
  });
}
module.exports={createPreviewServer};
if(require.main===module){const server=createPreviewServer();server.listen(Number(process.env.CARD_LAB_PORT||4188),'127.0.0.1',()=>console.log(`Card lab preview: http://127.0.0.1:${server.address().port}/card-lab.html`));}
