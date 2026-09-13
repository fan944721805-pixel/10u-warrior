// Local trial launcher. Opens the browser only after this server has started.
const { execFile } = require('node:child_process');
const { createWarriorServer } = require('./server');

const port = Number(process.env.PORT || 5174);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid PORT');
const server = createWarriorServer({ port, liveTradingEnabled: false, liveQuotesEnabled: false, aiDecisionMode: 'mock' });
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? `Port ${port} is in use. Close the other instance or set PORT to another number.` : error.message);
  server.close();
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${server.address().port}`;
  console.log(`10U Warrior: ${url}\nPaper simulation. Live trading is disabled. Press Ctrl+C to stop.`);
  if (process.argv.includes('--no-open')) return;
  const [command, args] = process.platform === 'win32' ? ['explorer.exe', [url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  execFile(command, args, { windowsHide: true }, error => {
    if (error) console.log(`Open this address in your browser: ${url}`);
  });
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
});
