const path = require('node:path');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
esbuild.build({
  entryPoints: [path.join(root, 'mobile/runtime.cjs')],
  outfile: path.join(root, 'public/mobile-runtime.js'), bundle: true, platform: 'browser', format: 'iife', target: 'chrome100',
  alias: {
    'node:fs': path.join(root, 'mobile/fs.cjs'), 'node:path': path.join(root, 'mobile/path.cjs'),
    'node:crypto': path.join(root, 'mobile/crypto.cjs'),
    // Relative imports are resolved through these absolute source aliases below.
  },
  plugins: [{ name: 'mobile-adapters', setup(build) {
    build.onResolve({ filter: /^\.\/atomic-json$/ }, () => ({ path: path.join(root, 'mobile/atomic-json.cjs') }));
    build.onResolve({ filter: /^\.\/ai-transport$/ }, () => ({ path: path.join(root, 'mobile/http.cjs') }));
  } }],
  define: { 'process.pid': '0' },
  logLevel: 'info',
}).catch(() => { process.exitCode = 1; });
