// Native protocol/runtime contracts plus the current card UI; no device operations.
const {spawnSync} = require('node:child_process');
const path = require('node:path');
const commands = [
  ['--test', 'test/mobile-runtime.test.js', 'test/mobile-wallet.test.js'],
  ['scripts/verify-card-wallet-native.cjs'],
  ['scripts/verify-card-device.cjs'],
];
for (const args of commands) {
  const result = spawnSync(process.execPath, args, {cwd:path.resolve(__dirname, '..'), stdio:'inherit', windowsHide:true});
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('PASS: current native runtime and UI contracts (isolated bridges, not device proof)');
