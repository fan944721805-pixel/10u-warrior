const { sha256 } = require('@noble/hashes/sha256');
module.exports = {
  randomUUID: () => globalThis.crypto.randomUUID(),
  randomInt(max) {
    if (!Number.isSafeInteger(max) || max < 1 || max > 0xffffffff) throw Error('INVALID_RANDOM_RANGE');
    const limit = Math.floor(0x100000000 / max) * max;
    let value;
    do { value = globalThis.crypto.getRandomValues(new Uint32Array(1))[0]; } while (value >= limit);
    return value % max;
  },
  createHash(algorithm) {
    if (algorithm !== 'sha256') throw Error('UNSUPPORTED_HASH');
    const hash = sha256.create();
    const result = {
      update(value) { hash.update(typeof value === 'string' ? new TextEncoder().encode(value) : value); return result; },
      digest(format) { if (format !== 'hex') throw Error('UNSUPPORTED_HASH_ENCODING'); return Array.from(hash.digest(), byte => byte.toString(16).padStart(2, '0')).join(''); },
    };
    return result;
  },
};
