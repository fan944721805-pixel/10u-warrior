// Isolated layout fixture: no app scripts, wallet, storage, or order endpoints.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../public');
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') {
    const count = [4, 6, 12].includes(Number(url.searchParams.get('count'))) ? Number(url.searchParams.get('count')) : 12;
    const en = url.searchParams.get('lang') === 'en';
    let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
    const start = html.indexOf('<div class="ai-config-list">');
    const end = html.indexOf('<section class="agent-editor"', start);
    const cards = Array.from({ length: count }, (_, index) => `<div class="ai-config" data-ai-config="fixture-${index}"><label class="ai-choice"><input type="checkbox" name="models" checked><span class="ai-avatar avatar-gpt" aria-hidden="true"></span><strong>${en ? 'Long Agent Name ' : '测试长名称角色'}${index + 1}</strong><small class="agent-strategy">${en ? 'Super AI' : '超级AI'}</small></label></div>`).join('');
    html = html.slice(0, start) + `<div class="ai-config-list">${cards}</div>` + html.slice(end);
    html = html.replace('<html lang="zh-CN">', `<html lang="${en ? 'en' : 'zh-CN'}">`);
    html = html.replace('</body>', '<script>document.querySelector("#create-dialog").showModal();document.querySelector("#create-form").onsubmit=e=>e.preventDefault();</script></body>');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); return;
  }
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  const type = { '.css': 'text/css', '.png': 'image/png' }[path.extname(file)];
  if (!type) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': type }); fs.createReadStream(file).pipe(res);
}).listen(0, '127.0.0.1', function () { console.log(`Agent layout fixture: http://127.0.0.1:${this.address().port}/?count=12&lang=en`); });
