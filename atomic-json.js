const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Unique siblings avoid collisions on '<ledger>.tmp'. Never delete the old file first.
function atomicWriteJson(file, value, { fsImpl = fs, sleep = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms) } = {}) {
  const temp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  let owned = false, operation = 'serialize';
  try {
    const content = JSON.stringify(value);
    operation = 'mkdir'; fsImpl.mkdirSync(path.dirname(file), { recursive: true });
    operation = 'write'; fsImpl.writeFileSync(temp, content, { mode: 0o600, flag: 'wx' }); owned = true;
    operation = 'rename';
    for (let attempt = 0; ; attempt++) {
      try { fsImpl.renameSync(temp, file); owned = false; break; }
      catch (cause) {
        if (attempt >= 2 || !['EPERM', 'EACCES', 'EBUSY'].includes(cause.code)) throw cause;
        sleep(20 * (attempt + 1)); // At most 60ms for transient Windows sharing locks.
      }
    }
  } catch (cause) { cause.storageOperation = operation; throw cause; }
  finally { if (owned) { try { fsImpl.unlinkSync(temp); } catch {} } }
}
module.exports = { atomicWriteJson };
