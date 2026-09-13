const fs = require('./fs.cjs');
// The Android adapter writes and fsyncs a temporary file then atomically renames
// it. It never reports success after a failed save or resets a damaged ledger.
function atomicWriteJson(file, value) {
  try { fs.writeFileSync(file, JSON.stringify(value)); }
  catch (cause) { cause.storageOperation = 'save'; throw cause; }
}
module.exports = { atomicWriteJson };
