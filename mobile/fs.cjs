// Synchronous, durable acknowledgments preserve the existing ledger invariant:
// a wager is saved before it is exposed to the rest of the application.
function call(op, path, extra = {}) {
  if (!globalThis.WarriorStorageNative?.call) throw Object.assign(Error('MOBILE_STORAGE_UNAVAILABLE'), { code: 'MOBILE_STORAGE_UNAVAILABLE' });
  const response = JSON.parse(globalThis.WarriorStorageNative.call(JSON.stringify({ op, path, ...extra })));
  if (!response.ok) throw Object.assign(Error(response.code || 'MOBILE_STORAGE_FAILED'), { code: response.code || 'MOBILE_STORAGE_FAILED' });
  return response.value;
}
module.exports = {
  existsSync: path => call('exists', path),
  readFileSync: path => call('read', path),
  writeFileSync: (path, data, options = {}) => call('write', path, { data: String(data), exclusive: options.flag === 'wx' }),
  renameSync: (path, destination) => call('rename', path, { destination }),
  copyFileSync: (path, destination) => call('copy', path, { destination }),
  unlinkSync: path => call('delete', path),
  mkdirSync: path => call('mkdir', path),
};
