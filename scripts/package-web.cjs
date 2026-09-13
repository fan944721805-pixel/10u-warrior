// Package the committed Web trial source, never local credentials or build output.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const version = process.argv[2];
if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?$/.test(version || '')) throw new Error('Usage: node scripts/package-web.cjs 0.1.9');
const git = args => execFileSync('git', args, { cwd: root, windowsHide: true }).toString().trim();
if (git(['status', '--porcelain', '--untracked-files=normal'])) throw new Error('Commit the release snapshot before packaging.');
const output = path.join(root, 'artifacts', 'releases', version);
fs.mkdirSync(output, { recursive: true });
const file = path.join(output, `10u-warrior-${version}-web.zip`);
if (fs.existsSync(file)) throw new Error('This Web archive already exists; choose a new release directory.');
execFileSync('git', ['archive', '--format=zip', '--prefix=10u-warrior-web/', `--output=${file}`, 'HEAD'], { cwd: root, windowsHide: true });
console.log(JSON.stringify({ file, commit: git(['rev-parse', 'HEAD']), bytes: fs.statSync(file).size }));
