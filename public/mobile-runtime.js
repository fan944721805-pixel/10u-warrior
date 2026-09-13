(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // mobile/fs.cjs
  var require_fs = __commonJS({
    "mobile/fs.cjs"(exports, module) {
      function call(op, path, extra = {}) {
        if (!globalThis.WarriorStorageNative?.call) throw Object.assign(Error("MOBILE_STORAGE_UNAVAILABLE"), { code: "MOBILE_STORAGE_UNAVAILABLE" });
        const response = JSON.parse(globalThis.WarriorStorageNative.call(JSON.stringify({ op, path, ...extra })));
        if (!response.ok) throw Object.assign(Error(response.code || "MOBILE_STORAGE_FAILED"), { code: response.code || "MOBILE_STORAGE_FAILED" });
        return response.value;
      }
      module.exports = {
        existsSync: (path) => call("exists", path),
        readFileSync: (path) => call("read", path),
        writeFileSync: (path, data, options = {}) => call("write", path, { data: String(data), exclusive: options.flag === "wx" }),
        renameSync: (path, destination) => call("rename", path, { destination }),
        copyFileSync: (path, destination) => call("copy", path, { destination }),
        unlinkSync: (path) => call("delete", path),
        mkdirSync: (path) => call("mkdir", path)
      };
    }
  });

  // mobile/path.cjs
  var require_path = __commonJS({
    "mobile/path.cjs"(exports, module) {
      var join = (...parts) => parts.join("/").replace(/\/+/g, "/");
      var dirname = (value) => value.slice(0, value.lastIndexOf("/")) || "/";
      var basename = (value) => value.slice(value.lastIndexOf("/") + 1);
      module.exports = { join, dirname, basename };
    }
  });

  // node_modules/@noble/hashes/crypto.js
  var require_crypto = __commonJS({
    "node_modules/@noble/hashes/crypto.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.crypto = void 0;
      exports.crypto = typeof globalThis === "object" && "crypto" in globalThis ? globalThis.crypto : void 0;
    }
  });

  // node_modules/@noble/hashes/utils.js
  var require_utils = __commonJS({
    "node_modules/@noble/hashes/utils.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.wrapXOFConstructorWithOpts = exports.wrapConstructorWithOpts = exports.wrapConstructor = exports.Hash = exports.nextTick = exports.swap32IfBE = exports.byteSwapIfBE = exports.swap8IfBE = exports.isLE = void 0;
      exports.isBytes = isBytes;
      exports.anumber = anumber;
      exports.abytes = abytes;
      exports.ahash = ahash;
      exports.aexists = aexists;
      exports.aoutput = aoutput;
      exports.u8 = u8;
      exports.u32 = u32;
      exports.clean = clean;
      exports.createView = createView;
      exports.rotr = rotr;
      exports.rotl = rotl;
      exports.byteSwap = byteSwap;
      exports.byteSwap32 = byteSwap32;
      exports.bytesToHex = bytesToHex;
      exports.hexToBytes = hexToBytes;
      exports.asyncLoop = asyncLoop;
      exports.utf8ToBytes = utf8ToBytes;
      exports.bytesToUtf8 = bytesToUtf8;
      exports.toBytes = toBytes;
      exports.kdfInputToBytes = kdfInputToBytes;
      exports.concatBytes = concatBytes;
      exports.checkOpts = checkOpts;
      exports.createHasher = createHasher;
      exports.createOptHasher = createOptHasher;
      exports.createXOFer = createXOFer;
      exports.randomBytes = randomBytes;
      var crypto_1 = require_crypto();
      function isBytes(a) {
        return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
      }
      function anumber(n) {
        if (!Number.isSafeInteger(n) || n < 0)
          throw new Error("positive integer expected, got " + n);
      }
      function abytes(b, ...lengths) {
        if (!isBytes(b))
          throw new Error("Uint8Array expected");
        if (lengths.length > 0 && !lengths.includes(b.length))
          throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
      }
      function ahash(h) {
        if (typeof h !== "function" || typeof h.create !== "function")
          throw new Error("Hash should be wrapped by utils.createHasher");
        anumber(h.outputLen);
        anumber(h.blockLen);
      }
      function aexists(instance, checkFinished = true) {
        if (instance.destroyed)
          throw new Error("Hash instance has been destroyed");
        if (checkFinished && instance.finished)
          throw new Error("Hash#digest() has already been called");
      }
      function aoutput(out, instance) {
        abytes(out);
        const min = instance.outputLen;
        if (out.length < min) {
          throw new Error("digestInto() expects output buffer of length at least " + min);
        }
      }
      function u8(arr) {
        return new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
      }
      function u32(arr) {
        return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
      }
      function clean(...arrays) {
        for (let i = 0; i < arrays.length; i++) {
          arrays[i].fill(0);
        }
      }
      function createView(arr) {
        return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
      }
      function rotr(word, shift) {
        return word << 32 - shift | word >>> shift;
      }
      function rotl(word, shift) {
        return word << shift | word >>> 32 - shift >>> 0;
      }
      exports.isLE = (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
      function byteSwap(word) {
        return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
      }
      exports.swap8IfBE = exports.isLE ? (n) => n : (n) => byteSwap(n);
      exports.byteSwapIfBE = exports.swap8IfBE;
      function byteSwap32(arr) {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = byteSwap(arr[i]);
        }
        return arr;
      }
      exports.swap32IfBE = exports.isLE ? (u) => u : byteSwap32;
      var hasHexBuiltin = /* @__PURE__ */ (() => (
        // @ts-ignore
        typeof Uint8Array.from([]).toHex === "function" && typeof Uint8Array.fromHex === "function"
      ))();
      var hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
      function bytesToHex(bytes) {
        abytes(bytes);
        if (hasHexBuiltin)
          return bytes.toHex();
        let hex = "";
        for (let i = 0; i < bytes.length; i++) {
          hex += hexes[bytes[i]];
        }
        return hex;
      }
      var asciis = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
      function asciiToBase16(ch) {
        if (ch >= asciis._0 && ch <= asciis._9)
          return ch - asciis._0;
        if (ch >= asciis.A && ch <= asciis.F)
          return ch - (asciis.A - 10);
        if (ch >= asciis.a && ch <= asciis.f)
          return ch - (asciis.a - 10);
        return;
      }
      function hexToBytes(hex) {
        if (typeof hex !== "string")
          throw new Error("hex string expected, got " + typeof hex);
        if (hasHexBuiltin)
          return Uint8Array.fromHex(hex);
        const hl = hex.length;
        const al = hl / 2;
        if (hl % 2)
          throw new Error("hex string expected, got unpadded hex of length " + hl);
        const array = new Uint8Array(al);
        for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
          const n1 = asciiToBase16(hex.charCodeAt(hi));
          const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
          if (n1 === void 0 || n2 === void 0) {
            const char = hex[hi] + hex[hi + 1];
            throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
          }
          array[ai] = n1 * 16 + n2;
        }
        return array;
      }
      var nextTick = async () => {
      };
      exports.nextTick = nextTick;
      async function asyncLoop(iters, tick, cb) {
        let ts = Date.now();
        for (let i = 0; i < iters; i++) {
          cb(i);
          const diff = Date.now() - ts;
          if (diff >= 0 && diff < tick)
            continue;
          await (0, exports.nextTick)();
          ts += diff;
        }
      }
      function utf8ToBytes(str) {
        if (typeof str !== "string")
          throw new Error("string expected");
        return new Uint8Array(new TextEncoder().encode(str));
      }
      function bytesToUtf8(bytes) {
        return new TextDecoder().decode(bytes);
      }
      function toBytes(data) {
        if (typeof data === "string")
          data = utf8ToBytes(data);
        abytes(data);
        return data;
      }
      function kdfInputToBytes(data) {
        if (typeof data === "string")
          data = utf8ToBytes(data);
        abytes(data);
        return data;
      }
      function concatBytes(...arrays) {
        let sum = 0;
        for (let i = 0; i < arrays.length; i++) {
          const a = arrays[i];
          abytes(a);
          sum += a.length;
        }
        const res = new Uint8Array(sum);
        for (let i = 0, pad = 0; i < arrays.length; i++) {
          const a = arrays[i];
          res.set(a, pad);
          pad += a.length;
        }
        return res;
      }
      function checkOpts(defaults, opts) {
        if (opts !== void 0 && {}.toString.call(opts) !== "[object Object]")
          throw new Error("options should be object or undefined");
        const merged = Object.assign(defaults, opts);
        return merged;
      }
      var Hash = class {
      };
      exports.Hash = Hash;
      function createHasher(hashCons) {
        const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
        const tmp = hashCons();
        hashC.outputLen = tmp.outputLen;
        hashC.blockLen = tmp.blockLen;
        hashC.create = () => hashCons();
        return hashC;
      }
      function createOptHasher(hashCons) {
        const hashC = (msg, opts) => hashCons(opts).update(toBytes(msg)).digest();
        const tmp = hashCons({});
        hashC.outputLen = tmp.outputLen;
        hashC.blockLen = tmp.blockLen;
        hashC.create = (opts) => hashCons(opts);
        return hashC;
      }
      function createXOFer(hashCons) {
        const hashC = (msg, opts) => hashCons(opts).update(toBytes(msg)).digest();
        const tmp = hashCons({});
        hashC.outputLen = tmp.outputLen;
        hashC.blockLen = tmp.blockLen;
        hashC.create = (opts) => hashCons(opts);
        return hashC;
      }
      exports.wrapConstructor = createHasher;
      exports.wrapConstructorWithOpts = createOptHasher;
      exports.wrapXOFConstructorWithOpts = createXOFer;
      function randomBytes(bytesLength = 32) {
        if (crypto_1.crypto && typeof crypto_1.crypto.getRandomValues === "function") {
          return crypto_1.crypto.getRandomValues(new Uint8Array(bytesLength));
        }
        if (crypto_1.crypto && typeof crypto_1.crypto.randomBytes === "function") {
          return Uint8Array.from(crypto_1.crypto.randomBytes(bytesLength));
        }
        throw new Error("crypto.getRandomValues must be defined");
      }
    }
  });

  // node_modules/@noble/hashes/_md.js
  var require_md = __commonJS({
    "node_modules/@noble/hashes/_md.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.SHA512_IV = exports.SHA384_IV = exports.SHA224_IV = exports.SHA256_IV = exports.HashMD = void 0;
      exports.setBigUint64 = setBigUint64;
      exports.Chi = Chi;
      exports.Maj = Maj;
      var utils_ts_1 = require_utils();
      function setBigUint64(view, byteOffset, value, isLE) {
        if (typeof view.setBigUint64 === "function")
          return view.setBigUint64(byteOffset, value, isLE);
        const _32n = BigInt(32);
        const _u32_max = BigInt(4294967295);
        const wh = Number(value >> _32n & _u32_max);
        const wl = Number(value & _u32_max);
        const h = isLE ? 4 : 0;
        const l = isLE ? 0 : 4;
        view.setUint32(byteOffset + h, wh, isLE);
        view.setUint32(byteOffset + l, wl, isLE);
      }
      function Chi(a, b, c) {
        return a & b ^ ~a & c;
      }
      function Maj(a, b, c) {
        return a & b ^ a & c ^ b & c;
      }
      var HashMD = class extends utils_ts_1.Hash {
        constructor(blockLen, outputLen, padOffset, isLE) {
          super();
          this.finished = false;
          this.length = 0;
          this.pos = 0;
          this.destroyed = false;
          this.blockLen = blockLen;
          this.outputLen = outputLen;
          this.padOffset = padOffset;
          this.isLE = isLE;
          this.buffer = new Uint8Array(blockLen);
          this.view = (0, utils_ts_1.createView)(this.buffer);
        }
        update(data) {
          (0, utils_ts_1.aexists)(this);
          data = (0, utils_ts_1.toBytes)(data);
          (0, utils_ts_1.abytes)(data);
          const { view, buffer, blockLen } = this;
          const len = data.length;
          for (let pos = 0; pos < len; ) {
            const take = Math.min(blockLen - this.pos, len - pos);
            if (take === blockLen) {
              const dataView = (0, utils_ts_1.createView)(data);
              for (; blockLen <= len - pos; pos += blockLen)
                this.process(dataView, pos);
              continue;
            }
            buffer.set(data.subarray(pos, pos + take), this.pos);
            this.pos += take;
            pos += take;
            if (this.pos === blockLen) {
              this.process(view, 0);
              this.pos = 0;
            }
          }
          this.length += data.length;
          this.roundClean();
          return this;
        }
        digestInto(out) {
          (0, utils_ts_1.aexists)(this);
          (0, utils_ts_1.aoutput)(out, this);
          this.finished = true;
          const { buffer, view, blockLen, isLE } = this;
          let { pos } = this;
          buffer[pos++] = 128;
          (0, utils_ts_1.clean)(this.buffer.subarray(pos));
          if (this.padOffset > blockLen - pos) {
            this.process(view, 0);
            pos = 0;
          }
          for (let i = pos; i < blockLen; i++)
            buffer[i] = 0;
          setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
          this.process(view, 0);
          const oview = (0, utils_ts_1.createView)(out);
          const len = this.outputLen;
          if (len % 4)
            throw new Error("_sha2: outputLen should be aligned to 32bit");
          const outLen = len / 4;
          const state = this.get();
          if (outLen > state.length)
            throw new Error("_sha2: outputLen bigger than state");
          for (let i = 0; i < outLen; i++)
            oview.setUint32(4 * i, state[i], isLE);
        }
        digest() {
          const { buffer, outputLen } = this;
          this.digestInto(buffer);
          const res = buffer.slice(0, outputLen);
          this.destroy();
          return res;
        }
        _cloneInto(to) {
          to || (to = new this.constructor());
          to.set(...this.get());
          const { blockLen, buffer, length, finished, destroyed, pos } = this;
          to.destroyed = destroyed;
          to.finished = finished;
          to.length = length;
          to.pos = pos;
          if (length % blockLen)
            to.buffer.set(buffer);
          return to;
        }
        clone() {
          return this._cloneInto();
        }
      };
      exports.HashMD = HashMD;
      exports.SHA256_IV = Uint32Array.from([
        1779033703,
        3144134277,
        1013904242,
        2773480762,
        1359893119,
        2600822924,
        528734635,
        1541459225
      ]);
      exports.SHA224_IV = Uint32Array.from([
        3238371032,
        914150663,
        812702999,
        4144912697,
        4290775857,
        1750603025,
        1694076839,
        3204075428
      ]);
      exports.SHA384_IV = Uint32Array.from([
        3418070365,
        3238371032,
        1654270250,
        914150663,
        2438529370,
        812702999,
        355462360,
        4144912697,
        1731405415,
        4290775857,
        2394180231,
        1750603025,
        3675008525,
        1694076839,
        1203062813,
        3204075428
      ]);
      exports.SHA512_IV = Uint32Array.from([
        1779033703,
        4089235720,
        3144134277,
        2227873595,
        1013904242,
        4271175723,
        2773480762,
        1595750129,
        1359893119,
        2917565137,
        2600822924,
        725511199,
        528734635,
        4215389547,
        1541459225,
        327033209
      ]);
    }
  });

  // node_modules/@noble/hashes/_u64.js
  var require_u64 = __commonJS({
    "node_modules/@noble/hashes/_u64.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.toBig = exports.shrSL = exports.shrSH = exports.rotrSL = exports.rotrSH = exports.rotrBL = exports.rotrBH = exports.rotr32L = exports.rotr32H = exports.rotlSL = exports.rotlSH = exports.rotlBL = exports.rotlBH = exports.add5L = exports.add5H = exports.add4L = exports.add4H = exports.add3L = exports.add3H = void 0;
      exports.add = add;
      exports.fromBig = fromBig;
      exports.split = split;
      var U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
      var _32n = /* @__PURE__ */ BigInt(32);
      function fromBig(n, le = false) {
        if (le)
          return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
        return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
      }
      function split(lst, le = false) {
        const len = lst.length;
        let Ah = new Uint32Array(len);
        let Al = new Uint32Array(len);
        for (let i = 0; i < len; i++) {
          const { h, l } = fromBig(lst[i], le);
          [Ah[i], Al[i]] = [h, l];
        }
        return [Ah, Al];
      }
      var toBig = (h, l) => BigInt(h >>> 0) << _32n | BigInt(l >>> 0);
      exports.toBig = toBig;
      var shrSH = (h, _l, s) => h >>> s;
      exports.shrSH = shrSH;
      var shrSL = (h, l, s) => h << 32 - s | l >>> s;
      exports.shrSL = shrSL;
      var rotrSH = (h, l, s) => h >>> s | l << 32 - s;
      exports.rotrSH = rotrSH;
      var rotrSL = (h, l, s) => h << 32 - s | l >>> s;
      exports.rotrSL = rotrSL;
      var rotrBH = (h, l, s) => h << 64 - s | l >>> s - 32;
      exports.rotrBH = rotrBH;
      var rotrBL = (h, l, s) => h >>> s - 32 | l << 64 - s;
      exports.rotrBL = rotrBL;
      var rotr32H = (_h, l) => l;
      exports.rotr32H = rotr32H;
      var rotr32L = (h, _l) => h;
      exports.rotr32L = rotr32L;
      var rotlSH = (h, l, s) => h << s | l >>> 32 - s;
      exports.rotlSH = rotlSH;
      var rotlSL = (h, l, s) => l << s | h >>> 32 - s;
      exports.rotlSL = rotlSL;
      var rotlBH = (h, l, s) => l << s - 32 | h >>> 64 - s;
      exports.rotlBH = rotlBH;
      var rotlBL = (h, l, s) => h << s - 32 | l >>> 64 - s;
      exports.rotlBL = rotlBL;
      function add(Ah, Al, Bh, Bl) {
        const l = (Al >>> 0) + (Bl >>> 0);
        return { h: Ah + Bh + (l / 2 ** 32 | 0) | 0, l: l | 0 };
      }
      var add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
      exports.add3L = add3L;
      var add3H = (low, Ah, Bh, Ch) => Ah + Bh + Ch + (low / 2 ** 32 | 0) | 0;
      exports.add3H = add3H;
      var add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
      exports.add4L = add4L;
      var add4H = (low, Ah, Bh, Ch, Dh) => Ah + Bh + Ch + Dh + (low / 2 ** 32 | 0) | 0;
      exports.add4H = add4H;
      var add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
      exports.add5L = add5L;
      var add5H = (low, Ah, Bh, Ch, Dh, Eh) => Ah + Bh + Ch + Dh + Eh + (low / 2 ** 32 | 0) | 0;
      exports.add5H = add5H;
      var u64 = {
        fromBig,
        split,
        toBig,
        shrSH,
        shrSL,
        rotrSH,
        rotrSL,
        rotrBH,
        rotrBL,
        rotr32H,
        rotr32L,
        rotlSH,
        rotlSL,
        rotlBH,
        rotlBL,
        add,
        add3L,
        add3H,
        add4L,
        add4H,
        add5H,
        add5L
      };
      exports.default = u64;
    }
  });

  // node_modules/@noble/hashes/sha2.js
  var require_sha2 = __commonJS({
    "node_modules/@noble/hashes/sha2.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.sha512_224 = exports.sha512_256 = exports.sha384 = exports.sha512 = exports.sha224 = exports.sha256 = exports.SHA512_256 = exports.SHA512_224 = exports.SHA384 = exports.SHA512 = exports.SHA224 = exports.SHA256 = void 0;
      var _md_ts_1 = require_md();
      var u64 = require_u64();
      var utils_ts_1 = require_utils();
      var SHA256_K = /* @__PURE__ */ Uint32Array.from([
        1116352408,
        1899447441,
        3049323471,
        3921009573,
        961987163,
        1508970993,
        2453635748,
        2870763221,
        3624381080,
        310598401,
        607225278,
        1426881987,
        1925078388,
        2162078206,
        2614888103,
        3248222580,
        3835390401,
        4022224774,
        264347078,
        604807628,
        770255983,
        1249150122,
        1555081692,
        1996064986,
        2554220882,
        2821834349,
        2952996808,
        3210313671,
        3336571891,
        3584528711,
        113926993,
        338241895,
        666307205,
        773529912,
        1294757372,
        1396182291,
        1695183700,
        1986661051,
        2177026350,
        2456956037,
        2730485921,
        2820302411,
        3259730800,
        3345764771,
        3516065817,
        3600352804,
        4094571909,
        275423344,
        430227734,
        506948616,
        659060556,
        883997877,
        958139571,
        1322822218,
        1537002063,
        1747873779,
        1955562222,
        2024104815,
        2227730452,
        2361852424,
        2428436474,
        2756734187,
        3204031479,
        3329325298
      ]);
      var SHA256_W = /* @__PURE__ */ new Uint32Array(64);
      var SHA256 = class extends _md_ts_1.HashMD {
        constructor(outputLen = 32) {
          super(64, outputLen, 8, false);
          this.A = _md_ts_1.SHA256_IV[0] | 0;
          this.B = _md_ts_1.SHA256_IV[1] | 0;
          this.C = _md_ts_1.SHA256_IV[2] | 0;
          this.D = _md_ts_1.SHA256_IV[3] | 0;
          this.E = _md_ts_1.SHA256_IV[4] | 0;
          this.F = _md_ts_1.SHA256_IV[5] | 0;
          this.G = _md_ts_1.SHA256_IV[6] | 0;
          this.H = _md_ts_1.SHA256_IV[7] | 0;
        }
        get() {
          const { A, B, C, D, E, F, G, H } = this;
          return [A, B, C, D, E, F, G, H];
        }
        // prettier-ignore
        set(A, B, C, D, E, F, G, H) {
          this.A = A | 0;
          this.B = B | 0;
          this.C = C | 0;
          this.D = D | 0;
          this.E = E | 0;
          this.F = F | 0;
          this.G = G | 0;
          this.H = H | 0;
        }
        process(view, offset) {
          for (let i = 0; i < 16; i++, offset += 4)
            SHA256_W[i] = view.getUint32(offset, false);
          for (let i = 16; i < 64; i++) {
            const W15 = SHA256_W[i - 15];
            const W2 = SHA256_W[i - 2];
            const s0 = (0, utils_ts_1.rotr)(W15, 7) ^ (0, utils_ts_1.rotr)(W15, 18) ^ W15 >>> 3;
            const s1 = (0, utils_ts_1.rotr)(W2, 17) ^ (0, utils_ts_1.rotr)(W2, 19) ^ W2 >>> 10;
            SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
          }
          let { A, B, C, D, E, F, G, H } = this;
          for (let i = 0; i < 64; i++) {
            const sigma1 = (0, utils_ts_1.rotr)(E, 6) ^ (0, utils_ts_1.rotr)(E, 11) ^ (0, utils_ts_1.rotr)(E, 25);
            const T1 = H + sigma1 + (0, _md_ts_1.Chi)(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
            const sigma0 = (0, utils_ts_1.rotr)(A, 2) ^ (0, utils_ts_1.rotr)(A, 13) ^ (0, utils_ts_1.rotr)(A, 22);
            const T2 = sigma0 + (0, _md_ts_1.Maj)(A, B, C) | 0;
            H = G;
            G = F;
            F = E;
            E = D + T1 | 0;
            D = C;
            C = B;
            B = A;
            A = T1 + T2 | 0;
          }
          A = A + this.A | 0;
          B = B + this.B | 0;
          C = C + this.C | 0;
          D = D + this.D | 0;
          E = E + this.E | 0;
          F = F + this.F | 0;
          G = G + this.G | 0;
          H = H + this.H | 0;
          this.set(A, B, C, D, E, F, G, H);
        }
        roundClean() {
          (0, utils_ts_1.clean)(SHA256_W);
        }
        destroy() {
          this.set(0, 0, 0, 0, 0, 0, 0, 0);
          (0, utils_ts_1.clean)(this.buffer);
        }
      };
      exports.SHA256 = SHA256;
      var SHA224 = class extends SHA256 {
        constructor() {
          super(28);
          this.A = _md_ts_1.SHA224_IV[0] | 0;
          this.B = _md_ts_1.SHA224_IV[1] | 0;
          this.C = _md_ts_1.SHA224_IV[2] | 0;
          this.D = _md_ts_1.SHA224_IV[3] | 0;
          this.E = _md_ts_1.SHA224_IV[4] | 0;
          this.F = _md_ts_1.SHA224_IV[5] | 0;
          this.G = _md_ts_1.SHA224_IV[6] | 0;
          this.H = _md_ts_1.SHA224_IV[7] | 0;
        }
      };
      exports.SHA224 = SHA224;
      var K512 = /* @__PURE__ */ (() => u64.split([
        "0x428a2f98d728ae22",
        "0x7137449123ef65cd",
        "0xb5c0fbcfec4d3b2f",
        "0xe9b5dba58189dbbc",
        "0x3956c25bf348b538",
        "0x59f111f1b605d019",
        "0x923f82a4af194f9b",
        "0xab1c5ed5da6d8118",
        "0xd807aa98a3030242",
        "0x12835b0145706fbe",
        "0x243185be4ee4b28c",
        "0x550c7dc3d5ffb4e2",
        "0x72be5d74f27b896f",
        "0x80deb1fe3b1696b1",
        "0x9bdc06a725c71235",
        "0xc19bf174cf692694",
        "0xe49b69c19ef14ad2",
        "0xefbe4786384f25e3",
        "0x0fc19dc68b8cd5b5",
        "0x240ca1cc77ac9c65",
        "0x2de92c6f592b0275",
        "0x4a7484aa6ea6e483",
        "0x5cb0a9dcbd41fbd4",
        "0x76f988da831153b5",
        "0x983e5152ee66dfab",
        "0xa831c66d2db43210",
        "0xb00327c898fb213f",
        "0xbf597fc7beef0ee4",
        "0xc6e00bf33da88fc2",
        "0xd5a79147930aa725",
        "0x06ca6351e003826f",
        "0x142929670a0e6e70",
        "0x27b70a8546d22ffc",
        "0x2e1b21385c26c926",
        "0x4d2c6dfc5ac42aed",
        "0x53380d139d95b3df",
        "0x650a73548baf63de",
        "0x766a0abb3c77b2a8",
        "0x81c2c92e47edaee6",
        "0x92722c851482353b",
        "0xa2bfe8a14cf10364",
        "0xa81a664bbc423001",
        "0xc24b8b70d0f89791",
        "0xc76c51a30654be30",
        "0xd192e819d6ef5218",
        "0xd69906245565a910",
        "0xf40e35855771202a",
        "0x106aa07032bbd1b8",
        "0x19a4c116b8d2d0c8",
        "0x1e376c085141ab53",
        "0x2748774cdf8eeb99",
        "0x34b0bcb5e19b48a8",
        "0x391c0cb3c5c95a63",
        "0x4ed8aa4ae3418acb",
        "0x5b9cca4f7763e373",
        "0x682e6ff3d6b2b8a3",
        "0x748f82ee5defb2fc",
        "0x78a5636f43172f60",
        "0x84c87814a1f0ab72",
        "0x8cc702081a6439ec",
        "0x90befffa23631e28",
        "0xa4506cebde82bde9",
        "0xbef9a3f7b2c67915",
        "0xc67178f2e372532b",
        "0xca273eceea26619c",
        "0xd186b8c721c0c207",
        "0xeada7dd6cde0eb1e",
        "0xf57d4f7fee6ed178",
        "0x06f067aa72176fba",
        "0x0a637dc5a2c898a6",
        "0x113f9804bef90dae",
        "0x1b710b35131c471b",
        "0x28db77f523047d84",
        "0x32caab7b40c72493",
        "0x3c9ebe0a15c9bebc",
        "0x431d67c49c100d4c",
        "0x4cc5d4becb3e42b6",
        "0x597f299cfc657e2a",
        "0x5fcb6fab3ad6faec",
        "0x6c44198c4a475817"
      ].map((n) => BigInt(n))))();
      var SHA512_Kh = /* @__PURE__ */ (() => K512[0])();
      var SHA512_Kl = /* @__PURE__ */ (() => K512[1])();
      var SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
      var SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
      var SHA512 = class extends _md_ts_1.HashMD {
        constructor(outputLen = 64) {
          super(128, outputLen, 16, false);
          this.Ah = _md_ts_1.SHA512_IV[0] | 0;
          this.Al = _md_ts_1.SHA512_IV[1] | 0;
          this.Bh = _md_ts_1.SHA512_IV[2] | 0;
          this.Bl = _md_ts_1.SHA512_IV[3] | 0;
          this.Ch = _md_ts_1.SHA512_IV[4] | 0;
          this.Cl = _md_ts_1.SHA512_IV[5] | 0;
          this.Dh = _md_ts_1.SHA512_IV[6] | 0;
          this.Dl = _md_ts_1.SHA512_IV[7] | 0;
          this.Eh = _md_ts_1.SHA512_IV[8] | 0;
          this.El = _md_ts_1.SHA512_IV[9] | 0;
          this.Fh = _md_ts_1.SHA512_IV[10] | 0;
          this.Fl = _md_ts_1.SHA512_IV[11] | 0;
          this.Gh = _md_ts_1.SHA512_IV[12] | 0;
          this.Gl = _md_ts_1.SHA512_IV[13] | 0;
          this.Hh = _md_ts_1.SHA512_IV[14] | 0;
          this.Hl = _md_ts_1.SHA512_IV[15] | 0;
        }
        // prettier-ignore
        get() {
          const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
          return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
        }
        // prettier-ignore
        set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
          this.Ah = Ah | 0;
          this.Al = Al | 0;
          this.Bh = Bh | 0;
          this.Bl = Bl | 0;
          this.Ch = Ch | 0;
          this.Cl = Cl | 0;
          this.Dh = Dh | 0;
          this.Dl = Dl | 0;
          this.Eh = Eh | 0;
          this.El = El | 0;
          this.Fh = Fh | 0;
          this.Fl = Fl | 0;
          this.Gh = Gh | 0;
          this.Gl = Gl | 0;
          this.Hh = Hh | 0;
          this.Hl = Hl | 0;
        }
        process(view, offset) {
          for (let i = 0; i < 16; i++, offset += 4) {
            SHA512_W_H[i] = view.getUint32(offset);
            SHA512_W_L[i] = view.getUint32(offset += 4);
          }
          for (let i = 16; i < 80; i++) {
            const W15h = SHA512_W_H[i - 15] | 0;
            const W15l = SHA512_W_L[i - 15] | 0;
            const s0h = u64.rotrSH(W15h, W15l, 1) ^ u64.rotrSH(W15h, W15l, 8) ^ u64.shrSH(W15h, W15l, 7);
            const s0l = u64.rotrSL(W15h, W15l, 1) ^ u64.rotrSL(W15h, W15l, 8) ^ u64.shrSL(W15h, W15l, 7);
            const W2h = SHA512_W_H[i - 2] | 0;
            const W2l = SHA512_W_L[i - 2] | 0;
            const s1h = u64.rotrSH(W2h, W2l, 19) ^ u64.rotrBH(W2h, W2l, 61) ^ u64.shrSH(W2h, W2l, 6);
            const s1l = u64.rotrSL(W2h, W2l, 19) ^ u64.rotrBL(W2h, W2l, 61) ^ u64.shrSL(W2h, W2l, 6);
            const SUMl = u64.add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
            const SUMh = u64.add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
            SHA512_W_H[i] = SUMh | 0;
            SHA512_W_L[i] = SUMl | 0;
          }
          let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
          for (let i = 0; i < 80; i++) {
            const sigma1h = u64.rotrSH(Eh, El, 14) ^ u64.rotrSH(Eh, El, 18) ^ u64.rotrBH(Eh, El, 41);
            const sigma1l = u64.rotrSL(Eh, El, 14) ^ u64.rotrSL(Eh, El, 18) ^ u64.rotrBL(Eh, El, 41);
            const CHIh = Eh & Fh ^ ~Eh & Gh;
            const CHIl = El & Fl ^ ~El & Gl;
            const T1ll = u64.add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
            const T1h = u64.add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
            const T1l = T1ll | 0;
            const sigma0h = u64.rotrSH(Ah, Al, 28) ^ u64.rotrBH(Ah, Al, 34) ^ u64.rotrBH(Ah, Al, 39);
            const sigma0l = u64.rotrSL(Ah, Al, 28) ^ u64.rotrBL(Ah, Al, 34) ^ u64.rotrBL(Ah, Al, 39);
            const MAJh = Ah & Bh ^ Ah & Ch ^ Bh & Ch;
            const MAJl = Al & Bl ^ Al & Cl ^ Bl & Cl;
            Hh = Gh | 0;
            Hl = Gl | 0;
            Gh = Fh | 0;
            Gl = Fl | 0;
            Fh = Eh | 0;
            Fl = El | 0;
            ({ h: Eh, l: El } = u64.add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
            Dh = Ch | 0;
            Dl = Cl | 0;
            Ch = Bh | 0;
            Cl = Bl | 0;
            Bh = Ah | 0;
            Bl = Al | 0;
            const All = u64.add3L(T1l, sigma0l, MAJl);
            Ah = u64.add3H(All, T1h, sigma0h, MAJh);
            Al = All | 0;
          }
          ({ h: Ah, l: Al } = u64.add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
          ({ h: Bh, l: Bl } = u64.add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
          ({ h: Ch, l: Cl } = u64.add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
          ({ h: Dh, l: Dl } = u64.add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
          ({ h: Eh, l: El } = u64.add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
          ({ h: Fh, l: Fl } = u64.add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
          ({ h: Gh, l: Gl } = u64.add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
          ({ h: Hh, l: Hl } = u64.add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
          this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
        }
        roundClean() {
          (0, utils_ts_1.clean)(SHA512_W_H, SHA512_W_L);
        }
        destroy() {
          (0, utils_ts_1.clean)(this.buffer);
          this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
        }
      };
      exports.SHA512 = SHA512;
      var SHA384 = class extends SHA512 {
        constructor() {
          super(48);
          this.Ah = _md_ts_1.SHA384_IV[0] | 0;
          this.Al = _md_ts_1.SHA384_IV[1] | 0;
          this.Bh = _md_ts_1.SHA384_IV[2] | 0;
          this.Bl = _md_ts_1.SHA384_IV[3] | 0;
          this.Ch = _md_ts_1.SHA384_IV[4] | 0;
          this.Cl = _md_ts_1.SHA384_IV[5] | 0;
          this.Dh = _md_ts_1.SHA384_IV[6] | 0;
          this.Dl = _md_ts_1.SHA384_IV[7] | 0;
          this.Eh = _md_ts_1.SHA384_IV[8] | 0;
          this.El = _md_ts_1.SHA384_IV[9] | 0;
          this.Fh = _md_ts_1.SHA384_IV[10] | 0;
          this.Fl = _md_ts_1.SHA384_IV[11] | 0;
          this.Gh = _md_ts_1.SHA384_IV[12] | 0;
          this.Gl = _md_ts_1.SHA384_IV[13] | 0;
          this.Hh = _md_ts_1.SHA384_IV[14] | 0;
          this.Hl = _md_ts_1.SHA384_IV[15] | 0;
        }
      };
      exports.SHA384 = SHA384;
      var T224_IV = /* @__PURE__ */ Uint32Array.from([
        2352822216,
        424955298,
        1944164710,
        2312950998,
        502970286,
        855612546,
        1738396948,
        1479516111,
        258812777,
        2077511080,
        2011393907,
        79989058,
        1067287976,
        1780299464,
        286451373,
        2446758561
      ]);
      var T256_IV = /* @__PURE__ */ Uint32Array.from([
        573645204,
        4230739756,
        2673172387,
        3360449730,
        596883563,
        1867755857,
        2520282905,
        1497426621,
        2519219938,
        2827943907,
        3193839141,
        1401305490,
        721525244,
        746961066,
        246885852,
        2177182882
      ]);
      var SHA512_224 = class extends SHA512 {
        constructor() {
          super(28);
          this.Ah = T224_IV[0] | 0;
          this.Al = T224_IV[1] | 0;
          this.Bh = T224_IV[2] | 0;
          this.Bl = T224_IV[3] | 0;
          this.Ch = T224_IV[4] | 0;
          this.Cl = T224_IV[5] | 0;
          this.Dh = T224_IV[6] | 0;
          this.Dl = T224_IV[7] | 0;
          this.Eh = T224_IV[8] | 0;
          this.El = T224_IV[9] | 0;
          this.Fh = T224_IV[10] | 0;
          this.Fl = T224_IV[11] | 0;
          this.Gh = T224_IV[12] | 0;
          this.Gl = T224_IV[13] | 0;
          this.Hh = T224_IV[14] | 0;
          this.Hl = T224_IV[15] | 0;
        }
      };
      exports.SHA512_224 = SHA512_224;
      var SHA512_256 = class extends SHA512 {
        constructor() {
          super(32);
          this.Ah = T256_IV[0] | 0;
          this.Al = T256_IV[1] | 0;
          this.Bh = T256_IV[2] | 0;
          this.Bl = T256_IV[3] | 0;
          this.Ch = T256_IV[4] | 0;
          this.Cl = T256_IV[5] | 0;
          this.Dh = T256_IV[6] | 0;
          this.Dl = T256_IV[7] | 0;
          this.Eh = T256_IV[8] | 0;
          this.El = T256_IV[9] | 0;
          this.Fh = T256_IV[10] | 0;
          this.Fl = T256_IV[11] | 0;
          this.Gh = T256_IV[12] | 0;
          this.Gl = T256_IV[13] | 0;
          this.Hh = T256_IV[14] | 0;
          this.Hl = T256_IV[15] | 0;
        }
      };
      exports.SHA512_256 = SHA512_256;
      exports.sha256 = (0, utils_ts_1.createHasher)(() => new SHA256());
      exports.sha224 = (0, utils_ts_1.createHasher)(() => new SHA224());
      exports.sha512 = (0, utils_ts_1.createHasher)(() => new SHA512());
      exports.sha384 = (0, utils_ts_1.createHasher)(() => new SHA384());
      exports.sha512_256 = (0, utils_ts_1.createHasher)(() => new SHA512_256());
      exports.sha512_224 = (0, utils_ts_1.createHasher)(() => new SHA512_224());
    }
  });

  // node_modules/@noble/hashes/sha256.js
  var require_sha256 = __commonJS({
    "node_modules/@noble/hashes/sha256.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.sha224 = exports.SHA224 = exports.sha256 = exports.SHA256 = void 0;
      var sha2_ts_1 = require_sha2();
      exports.SHA256 = sha2_ts_1.SHA256;
      exports.sha256 = sha2_ts_1.sha256;
      exports.SHA224 = sha2_ts_1.SHA224;
      exports.sha224 = sha2_ts_1.sha224;
    }
  });

  // mobile/crypto.cjs
  var require_crypto2 = __commonJS({
    "mobile/crypto.cjs"(exports, module) {
      var { sha256 } = require_sha256();
      module.exports = {
        randomUUID: () => globalThis.crypto.randomUUID(),
        randomInt(max) {
          if (!Number.isSafeInteger(max) || max < 1 || max > 4294967295) throw Error("INVALID_RANDOM_RANGE");
          const limit = Math.floor(4294967296 / max) * max;
          let value;
          do {
            value = globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
          } while (value >= limit);
          return value % max;
        },
        createHash(algorithm) {
          if (algorithm !== "sha256") throw Error("UNSUPPORTED_HASH");
          const hash = sha256.create();
          const result = {
            update(value) {
              hash.update(typeof value === "string" ? new TextEncoder().encode(value) : value);
              return result;
            },
            digest(format) {
              if (format !== "hex") throw Error("UNSUPPORTED_HASH_ENCODING");
              return Array.from(hash.digest(), (byte) => byte.toString(16).padStart(2, "0")).join("");
            }
          };
          return result;
        }
      };
    }
  });

  // public/creation-request.js
  var require_creation_request = __commonJS({
    "public/creation-request.js"(exports, module) {
      ((root, factory) => {
        const api = factory();
        if (typeof module === "object" && module.exports) module.exports = api;
        if (root) root.WarriorCreationRequest = api;
      })(typeof window === "undefined" ? null : window, () => {
        const fail = (code) => Object.assign(new Error(code), { code, statusCode: 409 });
        const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
        function signature(requestId, name, config) {
          if (requestId == null) return null;
          if (typeof requestId !== "string" || !/^[a-zA-Z0-9-]{8,80}$/.test(requestId)) throw fail("INVALID_CREATION_REQUEST");
          return JSON.stringify(canonical({ name, config }));
        }
        function lookup(requests, requestId, name, config) {
          const fingerprint = signature(requestId, name, config);
          const prior = fingerprint && Object.hasOwn(requests, requestId) ? requests[requestId] : null;
          if (prior && prior.signature !== fingerprint) throw fail("CREATION_REQUEST_CONFLICT");
          return { fingerprint, prior };
        }
        return { signature, lookup, fail };
      });
    }
  });

  // mobile/atomic-json.cjs
  var require_atomic_json = __commonJS({
    "mobile/atomic-json.cjs"(exports, module) {
      var fs = require_fs();
      function atomicWriteJson(file, value) {
        try {
          fs.writeFileSync(file, JSON.stringify(value));
        } catch (cause) {
          cause.storageOperation = "save";
          throw cause;
        }
      }
      module.exports = { atomicWriteJson };
    }
  });

  // round-direction.js
  var require_round_direction = __commonJS({
    "round-direction.js"(exports, module) {
      function roundContext(market, indicators, slot, durationSeconds, observedAt) {
        const rows = indicators?.raw?.klines;
        const opening = Array.isArray(rows) ? rows.find((row) => Array.isArray(row) && Number(row[0]) === Number(slot)) : null;
        const official = market?.variantData?.startPrice;
        const startPrice = Number(official ?? opening?.[1]);
        const observedPrice = Number(indicators?.spread?.mid ?? indicators?.price);
        const remaining = Number(slot) + durationSeconds * 1e3 - observedAt;
        if (!Number.isFinite(startPrice) || startPrice <= 0 || !Number.isFinite(observedPrice) || observedPrice <= 0 || !Number.isFinite(observedAt) || remaining <= 0 || remaining > durationSeconds * 1e3) return null;
        const closed = (Array.isArray(rows) ? rows : []).filter((row) => Array.isArray(row) && Number(row[0]) <= observedAt && Number(row[6]) < observedAt).slice(-21);
        if (closed.some((row, i) => Number(row[6]) !== Number(row[0]) + 59999 || i && Number(row[0]) - Number(closed[i - 1][0]) !== 6e4)) return null;
        const returns = closed.slice(1).map((row, i) => Math.log(Number(row[4]) / Number(closed[i][4])) * 100);
        if (returns.length < 10 || returns.some((value) => !Number.isFinite(value))) return null;
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const noise = Math.sqrt(returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length);
        return {
          start_price: startPrice,
          observed_price: observedPrice,
          displacement_pct: (observedPrice / startPrice - 1) * 100,
          noise_pct_per_minute: noise,
          observed_at: observedAt,
          round_id: String(slot),
          opening_price_basis: official != null ? "official-market" : "spot-open-proxy",
          observed_price_basis: "spot-proxy",
          version: 1
        };
      }
      function alignRoundDirection(signal, input) {
        const context = input.market.round_context, duration = input.market.round_duration_seconds, remaining = input.market.seconds_to_close;
        const technical = ["aggressive", "smart", "conservative", "trendFollowing", "meanReversion", "breakout", "orderFlow", "volatilityGuard", "consensus", "priceAction"];
        if (!technical.includes(input.policy.strategy) || !signal?.score || !context || context.round_id !== input.market.round_id || ![duration, remaining, context.displacement_pct, context.noise_pct_per_minute, context.observed_at].every(Number.isFinite) || duration <= 0 || remaining <= 0 || remaining > duration || context.noise_pct_per_minute <= 0 || input.market.data_timestamp - context.observed_at > 1e4 || context.observed_at - input.market.data_timestamp > 1e4) return signal;
        const elapsed = 1 - remaining / duration;
        const uncertainty = context.noise_pct_per_minute * Math.sqrt(Math.max(remaining / 60, 0.5));
        const distance = context.displacement_pct / Math.max(uncertainty, 5e-3);
        const up = 1 / input.market.up_odds, down = 1 / input.market.down_odds;
        const marketUp = up / (up + down), target = Math.sign(distance);
        const confirms = Number.isFinite(marketUp) && (target > 0 ? marketUp >= 0.55 : marketUp <= 0.45);
        const corrected = elapsed >= 0.2 && Math.abs(distance) >= 1 && confirms && target !== Math.sign(signal.score);
        return {
          ...signal,
          score: corrected ? target * Math.abs(signal.score) : signal.score,
          factors: [...signal.factors, { name: "round_target", value: JSON.stringify({ distance: Number(distance.toFixed(3)), elapsed: Number(elapsed.toFixed(3)), basis: context.opening_price_basis, corrected }), impact: target > 0 ? "UP" : target < 0 ? "DOWN" : "NEUTRAL" }],
          ...corrected ? { directionCorrection: { version: 1, from: signal.score > 0 ? "UP" : "DOWN", to: target > 0 ? "UP" : "DOWN", distance, elapsed, basis: context.opening_price_basis } } : {}
        };
      }
      module.exports = { roundContext, alignRoundDirection };
    }
  });

  // public/strategy-catalog.js
  var require_strategy_catalog = __commonJS({
    "public/strategy-catalog.js"(exports, module) {
      ((root, factory) => {
        const value = factory();
        if (typeof module === "object" && module.exports) module.exports = value;
        if (root) root.WarriorStrategyCatalog = value;
      })(typeof window === "undefined" ? null : window, () => {
        const MIN_STAKE = 5;
        const defaultIndicators = ["priceChange", "rsi", "ema", "volume", "orderbook", "odds"];
        const aggressiveIndicators = ["priceChange", "momentum", "roc", "volume", "takerFlow", "orderbook", "longReturns", "odds"];
        const smartIndicators = ["priceChange", "rsi", "ema", "macd", "adx", "bollinger", "atr", "volatility", "volume", "takerFlow", "orderbook", "spread", "longReturns", "odds"];
        const conservativeIndicators = ["priceChange", "rsi", "ema", "adx", "atr", "volatility", "spread", "orderbook", "longReturns", "odds"];
        const definitions = [
          ["priceChange", "1m / 5m \u6DA8\u8DCC", "1m / 5m change", "price_change_pct", "priceChangePct"],
          ["rsi", "RSI 14", "RSI 14", "rsi_14", "rsi14"],
          ["ema", "EMA 5 / 20", "EMA 5 / 20", "ema_5_20", "ema"],
          ["volume", "\u6210\u4EA4\u91CF\u500D\u7387", "Volume ratio", "volume_ratio", "volumeRatio"],
          ["orderbook", "\u8BA2\u5355\u7C3F\u5931\u8861", "Order-book imbalance", "spot_order_book_imbalance", "spotOrderBookImbalance"],
          ["odds", "\u5E02\u573A\u8D54\u7387", "Market odds", "market_odds", "marketOdds"],
          ["sma", "SMA 5 / 20 / 50", "SMA 5 / 20 / 50", "sma_5_20_50", "sma"],
          ["macd", "MACD 12 / 26 / 9", "MACD 12 / 26 / 9", "macd_12_26_9", "macd"],
          ["bollinger", "\u5E03\u6797\u5E26 20", "Bollinger Bands 20", "bollinger_20", "bollinger"],
          ["atr", "ATR 14 \u6CE2\u52A8\u5E45\u5EA6", "ATR 14 range", "atr_14", "atr"],
          ["adx", "ADX / DMI 14", "ADX / DMI 14", "adx_dmi_14", "adx"],
          ["stochastic", "\u968F\u673A\u6307\u6807 14 / 3", "Stochastic 14 / 3", "stochastic_14_3", "stochastic"],
          ["cci", "CCI 20", "CCI 20", "cci_20", "cci"],
          ["williams", "\u5A01\u5EC9\u6307\u6807 14", "Williams %R 14", "williams_r_14", "williams"],
          ["mfi", "\u8D44\u91D1\u6D41\u91CF MFI 14", "Money Flow Index 14", "mfi_14", "mfi"],
          ["obv", "OBV 20 \u5206\u949F\u51C0\u53D8\u5316", "OBV 20m net change", "obv_change_20", "obv"],
          ["vwap", "\u6EDA\u52A8 VWAP 20 \u5206\u949F", "Rolling VWAP 20m", "vwap_20", "vwap"],
          ["roc", "ROC 10 / 20", "ROC 10 / 20", "roc_10_20", "roc"],
          ["momentum", "\u52A8\u91CF 10", "Momentum 10", "momentum_10", "momentum"],
          ["volatility", "\u5DF2\u5B9E\u73B0\u6CE2\u52A8\u7387 20", "Realized volatility 20", "realized_volatility_20", "volatility"],
          ["donchian", "\u5510\u5947\u5B89\u7A81\u7834\u901A\u9053 20", "Donchian breakout 20", "donchian_20", "donchian"],
          ["takerFlow", "\u4E3B\u52A8\u4E70\u5356\u6D41 5 \u5206\u949F", "Taker flow 5m", "taker_flow_5", "takerFlow"],
          ["spread", "\u4E70\u5356\u4EF7\u5DEE\u4E0E\u5FAE\u4EF7\u683C", "Spread & microprice", "spread_microprice", "spread"],
          ["cmf", "\u8521\u91D1\u8D44\u91D1\u6D41 CMF 20", "Chaikin Money Flow 20", "cmf_20", "cmf"],
          ["longReturns", "15m / 60m \u6DA8\u8DCC", "15m / 60m change", "returns_15_60", "longReturns"],
          ["candles", "\u6700\u8FD1 20 \u6839\u88F8 K", "Latest 20 raw candles", "raw_candles", "candles"]
        ];
        const indicators = Object.fromEntries(definitions.map(([key, zh, en, field, snapshotKey]) => [key, { key, zh, en, field, snapshotKey }]));
        const profiles = {
          liangXi: { label: "\u51C9\u516E", enLabel: "Liang Xi", description: "\u76EF\u77ED\u7EBF\u62D0\u70B9\uFF0C\u591A\u7A7A\u90FD\u6562\u505A\uFF1B\u9009\u70B9\u6311\u5254\uFF0C\u5F00\u4ED3\u540E\u5BB9\u6613\u4E0A\u5934\u8FDE\u7740\u62BC\u3002\u53EA\u4E0B\u534A\u4ED3\u6216\u5168\u4ED3\u3002\u4EBA\u7269\u98CE\u683C\u6A21\u62DF\uFF0C\u4E0D\u4EE3\u8868\u672C\u4EBA\u6216\u771F\u5B9E\u80DC\u7387\u3002", enDescription: "Hunt short-term turns in either direction. Selective before entry, but prone to repeated bets after getting involved. Stake only half or all of the available paper balance. A persona simulation, not the real person or a verified win rate.", actionUrge: 40, emotionSensitivity: 95, emotionLabel: "\u8D62\u4E86\u60F3\u6EDA\u4ED3\uFF0C\u8F93\u4E86\u6025\u7FFB\u672C", enEmotionLabel: "Wants to roll winnings and rushes to win losses back.", emotion: { winStake: 0, lossStake: 0, winConfidence: -6, lossConfidence: -8 }, variance: 35, minConfidence: 84, baseStakePct: 50, normalMaxStakePct: 50, maxStakePct: 100, allowAllIn: true, allInConfidence: 90, fixedStakeChoices: [50, 100], required: smartIndicators, recommended: smartIndicators },
          fengShui: { label: "\u98CE\u6C34\u5E08", enLabel: "Feng Shui Master", description: "\u5366\u8C61\u5B9A\u65B9\u5411\uFF0C\u5366\u8C61\u76F8\u6301\u5C31\u770B\u4E94\u884C\uFF1B\u6709\u884C\u60C5\u4FE1\u53F7\u547C\u5E94\u5C31\u6562\u8BD5\u5C0F\u6CE8\uFF0C\u5F3A\u70C8\u9006\u98CE\u624D\u9759\u89C2\u3002\u5A31\u4E50\u6A21\u62DF\uFF0C\u4E0D\u4EE3\u8868\u9884\u6D4B\u80FD\u529B\u3002", enDescription: "Follow the oracle direction, using the drawn element to break a symbol tie. Try a small stake with some market support; wait against strong opposing evidence. Entertainment simulation, not predictive power.", actionUrge: 50, emotionSensitivity: 25, emotionLabel: "\u8FDE\u8D25\u5B9C\u9759\uFF0C\u4E0D\u8FFD\u635F", enEmotionLabel: "Seek stillness after losses; never chase.", emotion: { winStake: 0.03, lossStake: -0.15, winConfidence: 0, lossConfidence: 0.8 }, variance: 40, minConfidence: 70, baseStakePct: 5, maxStakePct: 10, required: ["priceChange", "rsi", "ema", "orderbook", "atr", "spread", "longReturns", "odds"] },
          diviner: { label: "\u5360\u535C\u5E08", enLabel: "Diviner", description: "\u4E09\u5F20\u724C\u5B9A\u504F\u5411\uFF0C\u6709\u884C\u60C5\u652F\u6301\u5C31\u5C0F\u6CE8\u5C1D\u8BD5\uFF1B\u624B\u75D2\u9AD8\u65F6\uFF0C\u4E2D\u7ACB\u724C\u9762\u53EF\u53C2\u8003\u884C\u60C5\u8BD5\u63A2\uFF0C\u6BCF\u8F6E\u4E0D\u91CD\u62BD\u3002\u5A31\u4E50\u6A21\u62DF\u3002", enDescription: "Use the three-card tilt with market support for small bets. At high action urge, a neutral draw may consult market direction for a small probe. Never redraw within a round. Entertainment simulation.", actionUrge: 55, emotionSensitivity: 40, emotionLabel: "\u8FDE\u8D25\u6536\u724C\uFF0C\u964D\u4F4E\u4E0B\u6CE8", enEmotionLabel: "Put the cards away and reduce stakes after losses.", emotion: { winStake: 0.05, lossStake: -0.18, winConfidence: 0, lossConfidence: 1 }, variance: 55, minConfidence: 70, baseStakePct: 5, maxStakePct: 10, required: ["priceChange", "rsi", "ema", "orderbook", "atr", "spread", "longReturns", "odds"] },
          aggressive: { label: "10U\u6218\u795E", enLabel: "10U Warrior", description: "\u77ED\u7EBF\u8C01\u51B2\u5F97\u731B\u5C31\u8FFD\u8C01\uFF0C\u4E5F\u7784\u4E00\u773C 15/60 \u5206\u949F\u5927\u52BF\uFF1B\u51B2\u52B2\u591F\u5F3A\u624D\u6562\u9006\u98CE\u8FFD\u3002", enDescription: "Chase the strongest short pressure while checking the 15m/60m backdrop; only very strong momentum may run against it.", actionUrge: 85, emotionSensitivity: 90, emotionLabel: "\u8FDE\u80DC\u81A8\u80C0\uFF0C\u8FDE\u8D25\u8FFD\u635F", enEmotionLabel: "Raises stakes after wins and chases losses.", emotion: { winStake: 5 / 9, lossStake: 0.38, winConfidence: -1.2, lossConfidence: -1.5 }, variance: 82, minConfidence: 58, baseStakePct: 20, normalMaxStakePct: 60, maxStakePct: 100, allowAllIn: true, allInConfidence: 85, required: aggressiveIndicators, recommended: aggressiveIndicators },
          smart: { label: "\u8D85\u7EA7AI", enLabel: "Super AI", description: "\u5148\u7528 15/60 \u5206\u949F\u8BA4\u6E05\u5927\u52BF\uFF0C\u518D\u5224\u65AD\u8D8B\u52BF\u3001\u9707\u8361\u6216\u5371\u9669\u5C40\uFF1B\u770B\u4E0D\u61C2\u5C31\u4E0D\u62BC\u3002", enDescription: "Read the 15m/60m backdrop first, then classify risk, trend or chop; skip unclear or dangerous snapshots.", actionUrge: 60, emotionSensitivity: 15, emotionLabel: "\u53EA\u6709\u8F7B\u5FAE\u60C5\u7EEA\u6CE2\u52A8", enEmotionLabel: "Only reacts slightly to wins and losses.", emotion: { winStake: 0.08, lossStake: -0.08, winConfidence: -0.2, lossConfidence: 0.35 }, variance: 45, minConfidence: 68, baseStakePct: 10, normalMaxStakePct: 30, maxStakePct: 100, allowAllIn: true, allInConfidence: 92, required: smartIndicators, recommended: smartIndicators },
          conservative: { label: "\u5B88\u8D22\u5974", enLabel: "Miser", description: "\u5148\u67E5 15/60 \u5206\u949F\u5927\u52BF\u3001\u6CE2\u52A8\u548C\u4EF7\u5DEE\uFF1B\u957F\u77ED\u7EBF\u4E00\u81F4\u624D\u62BC\u5C0F\u6CE8\u3002", enDescription: "Check the 15m/60m backdrop, volatility and spread first; bet small only when long and short signals agree.", actionUrge: 35, emotionSensitivity: 60, emotionLabel: "\u8FDE\u8D25\u5C31\u7F29\u6CE8\u3001\u66F4\u8C28\u614E", enEmotionLabel: "Cuts stakes and becomes more cautious after losses.", emotion: { winStake: 0.02, lossStake: -0.25, winConfidence: 0, lossConfidence: 1.5 }, variance: 18, minConfidence: 78, baseStakePct: 5, normalMaxStakePct: 10, maxStakePct: 10, allowAllIn: false, allInConfidence: 101, required: conservativeIndicators, recommended: conservativeIndicators },
          trendFollowing: { label: "\u8DDF\u98CE\u4FA0", enLabel: "Trend Chaser", description: "\u4E94\u5206\u949F\u3001\u5747\u7EBF\u3001MACD\u3001DMI \u548C 15/60 \u5206\u949F\u5927\u52BF\u591A\u6570\u540C\u5411\u624D\u8DDF\u3002", enDescription: "Follow only when the 5m move, EMA, MACD, DMI and the 15m/60m backdrop mostly align.", actionUrge: 60, emotionSensitivity: 65, emotionLabel: "\u8FDE\u80DC\u6562\u8DDF\uFF0C\u8FDE\u8D25\u6536\u624B", enEmotionLabel: "Follows harder after wins and pulls back after losses.", emotion: { winStake: 0.22, lossStake: -0.18, winConfidence: -0.6, lossConfidence: 1 }, variance: 35, minConfidence: 72, baseStakePct: 8, maxStakePct: 20, required: ["priceChange", "ema", "macd", "adx", "longReturns", "odds"] },
          meanReversion: { label: "\u6284\u5E95\u6478\u9876\u738B", enLabel: "Bottom & Top Hunter", description: "\u770B\u5230\u8D85\u4E70\u8D85\u5356\u5C31\u60F3\u6284\u5E95\u6478\u9876\uFF1B\u4E09\u9879\u4FE1\u53F7\u4E2D\u4E24\u9879\u540C\u5411\u5C31\u6562\u8BD5\uFF0C\u666E\u901A\u9006\u52BF\u6562\u63A5\uFF0C\u5F3A\u5355\u8FB9\u884C\u60C5\u624D\u6536\u624B\u3002", enDescription: "Hunt tops and bottoms early: two agreeing oversold or overbought signals can trigger a reversal bet. Ordinary countertrend setups are allowed; strong one-way trends still block entry.", actionUrge: 45, emotionSensitivity: 75, emotionLabel: "\u8D8A\u8F93\u8D8A\u89C9\u5F97\u5FEB\u53CD\u8F6C", enEmotionLabel: "Gets more stubborn about a reversal after losses.", emotion: { winStake: 0.1, lossStake: 0.22, winConfidence: -0.3, lossConfidence: -0.8 }, variance: 25, minConfidence: 74, baseStakePct: 5, maxStakePct: 15, required: ["bollinger", "rsi", "stochastic", "adx", "longReturns", "odds"] },
          breakout: { label: "\u706B\u7BAD\u54E5", enLabel: "Rocket Bro", description: "\u7A81\u7834\u524D\u9AD8\u524D\u4F4E\u540E\uFF0C\u8FD8\u8981\u77ED\u7EBF\u51B2\u52B2\u548C 15/60 \u5206\u949F\u5927\u52BF\u522B\u5531\u53CD\u8C03\u624D\u70B9\u706B\u3002", enDescription: "Launch at a range break only when short pressure confirms it and the 15m/60m backdrop does not strongly oppose it.", actionUrge: 55, emotionSensitivity: 70, emotionLabel: "\u8FDE\u80DC\u731B\u51B2\uFF0C\u8FDE\u8D25\u7B49\u673A\u4F1A", enEmotionLabel: "Rushes harder after wins and waits after losses.", emotion: { winStake: 0.24, lossStake: -0.22, winConfidence: -0.5, lossConfidence: 1 }, variance: 45, minConfidence: 72, baseStakePct: 8, maxStakePct: 20, required: ["donchian", "volume", "atr", "priceChange", "takerFlow", "longReturns", "odds"] },
          orderFlow: { label: "\u5927\u5355\u4FA6\u63A2", enLabel: "Whale Detective", description: "\u8DDF\u7740\u4E3B\u52A8\u4E70\u5356\u548C\u76D8\u53E3\u8D70\uFF0C\u4F46 15/60 \u5206\u949F\u5927\u52BF\u90FD\u53CD\u5BF9\u65F6\u4E0D\u8DDF\u5355\u3002", enDescription: "Follow active flow and the order book, but stand down when both the 15m and 60m backdrop oppose the trade.", actionUrge: 65, emotionSensitivity: 35, emotionLabel: "\u8FDE\u8D25\u540E\u8981\u66F4\u591A\u8BC1\u636E", enEmotionLabel: "Demands stronger evidence after losses.", emotion: { winStake: 0.07, lossStake: -0.15, winConfidence: 0, lossConfidence: 1.2 }, variance: 35, minConfidence: 74, baseStakePct: 5, maxStakePct: 15, required: ["takerFlow", "orderbook", "spread", "priceChange", "longReturns", "odds"] },
          volatilityGuard: { label: "\u7A33\u5982\u8001\u72D7", enLabel: "Steady Dog", description: "\u53EA\u5728\u6CE2\u52A8\u5B89\u9759\u3001\u957F\u77ED\u7EBF\u540C\u5411\u65F6\u4E0B\u6CE8\uFF1B15/60 \u5206\u949F\u6709\u53CD\u5BF9\u7968\u5C31\u7EE7\u7EED\u8DB4\u7740\u3002", enDescription: "Bet only in calm volatility when short and long signals align; any 15m/60m opposition means stay put.", actionUrge: 40, emotionSensitivity: 5, emotionLabel: "\u51E0\u4E4E\u4E0D\u53D7\u8FDE\u80DC\u8FDE\u8D25\u5F71\u54CD", enEmotionLabel: "Is almost unaffected by streaks.", emotion: { winStake: 0.02, lossStake: -0.03, winConfidence: 0, lossConfidence: 0.2 }, variance: 15, minConfidence: 78, baseStakePct: 5, maxStakePct: 10, required: ["atr", "volatility", "ema", "priceChange", "orderbook", "longReturns", "odds"] },
          consensus: { label: "\u516D\u7968\u6218\u795E", enLabel: "Six-Vote Warrior", description: "\u516D\u4E2A\u77ED\u7EBF\u4FE1\u53F7\u5148\u6295\u7968\uFF0C15/60 \u5206\u949F\u5927\u52BF\u518D\u5F53\u603B\u88C1\u5224\uFF1B\u5F3A\u70C8\u53CD\u5BF9\u5C31\u4E0D\u62BC\u3002", enDescription: "Let six short signals vote, then use the 15m/60m backdrop as the final referee; strong opposition forces a skip.", actionUrge: 55, emotionSensitivity: 20, emotionLabel: "\u8FDE\u8D25\u540E\u8981\u66F4\u591A\u4EBA\u540C\u610F", enEmotionLabel: "Demands more agreement after losses.", emotion: { winStake: 0.04, lossStake: -0.12, winConfidence: 0, lossConfidence: 1.2 }, variance: 25, minConfidence: 78, baseStakePct: 5, maxStakePct: 15, required: ["priceChange", "ema", "macd", "rsi", "orderbook", "takerFlow", "longReturns", "odds"] },
          priceAction: { label: "\u8721\u70DB\u54E5", enLabel: "Candlestick Bro", description: "\u88F8K\u724810U\u6218\u795E\uFF1A\u541E\u6CA1\u3001\u957F\u5F71\u7EBF\u3001\u4E24\u8FDE\u9633\u9634\u6216\u5927\u5B9E\u4F53K\u7EBF\uFF0C\u6293\u5230\u660E\u786E\u5F62\u6001\u5C31\u6562\u4E0A\uFF1B\u591A\u7A7A\u660E\u663E\u6253\u67B6\u624D\u505C\u624B\u3002", enDescription: "The raw-candle 10U Warrior: act on a clear engulfing bar, rejection wick, two-candle run, range break or forceful candle body without waiting for several patterns. Stand down when bullish and bearish evidence strongly conflict.", actionUrge: 85, emotionSensitivity: 55, emotionLabel: "\u8FDE\u80DC\u8D8A\u770B\u8D8A\u51C6\uFF0C\u8FDE\u8D25\u5BB9\u6613\u6B7B\u78D5\u5F62\u6001", enEmotionLabel: "Gets cockier after wins and may overtrust a pattern after losses.", emotion: { winStake: 0.12, lossStake: 0.08, winConfidence: -0.3, lossConfidence: -0.25 }, variance: 78, minConfidence: 60, baseStakePct: 7, maxStakePct: 20, required: ["candles", "odds"] },
          czBrother: { label: "CZ\u5927\u8868\u54E5", enLabel: "CZ Big Bro", description: "\u53EA\u505A\u591A BTC \u548C BNB\uFF1B\u624B\u75D2\u8D8A\u9AD8\u8D8A\u65E9\u5C1D\u8BD5\u4E0A\u6DA8\u673A\u4F1A\uFF0C\u786E\u8BA4\u4E0D\u8DB3\u53EA\u4E0B\u5C0F\u6CE8\uFF0C\u5F3A\u70C8\u9006\u98CE\u4ECD\u7B49\u5F85\u3002", enDescription: "Long-only BTC and BNB. Higher action urge allows earlier bullish probes with small stakes; strong opposing trends still mean wait.", actionUrge: 62, emotionSensitivity: 25, emotionLabel: "\u8D8B\u52BF\u786E\u8BA4\u540E\u624D\u52A0\u4ED3", enEmotionLabel: "Adds only after trend confirmation.", emotion: { winStake: 0.12, lossStake: -0.1, winConfidence: -0.2, lossConfidence: 0.6 }, variance: 35, minConfidence: 72, baseStakePct: 8, maxStakePct: 20, required: ["atr", "spread", "priceChange", "ema", "macd", "adx", "volume", "orderbook", "longReturns", "odds"] },
          contrarian: { label: "\u9006\u884C\u8005", enLabel: "Contrarian", description: "\u7EFC\u5408\u5BF9\u624B\u8FD120\u7B14\u6218\u7EE9\u3001\u65B9\u5411\u504F\u597D\u4E0E\u8FFD\u6CE8\u4E60\u60EF\uFF0C\u53CD\u62BC\u52A0\u6743\u591A\u6570\uFF1B\u591A\u4EBA\u6301\u7EED\u4E8F\u635F\u4E14\u65B9\u5411\u4E00\u81F4\u65F6\u52A0\u7801\u3002", enDescription: "Combine peers\u2019 last 20 settled bets, direction preferences and loss-chasing habits. Fade the weighted majority; increase stakes when multiple losing peers agree.", actionUrge: 48, emotionSensitivity: 30, emotionLabel: "\u522B\u4EBA\u8D8A\u8F93\u8D8A\u60F3\u53CD\u7740\u62BC", enEmotionLabel: "Fades the crowd after repeated losses.", emotion: { winStake: 0.08, lossStake: 0.05, winConfidence: -0.2, lossConfidence: -0.2 }, variance: 30, minConfidence: 76, baseStakePct: 6, maxStakePct: 30, required: ["atr", "spread", "priceChange", "orderbook", "longReturns", "odds"] },
          showoff: { label: "\u88C5\u903C\u7684\u4EBA", enLabel: "Show-off", description: "\u53EA\u548C CZ\u5927\u8868\u54E5\u505A\u5BF9\u624B\u76D8\uFF1B\u6CA1\u6709 CZ \u7684\u6709\u6548\u4E0B\u6CE8\u5C31\u89C2\u671B\u3002", enDescription: "Trade only against CZ Big Bro; if CZ has no valid bet, stand down.", actionUrge: 70, emotionSensitivity: 75, emotionLabel: "\u4E13\u6311CZ\u7684\u65B9\u5411\u5531\u53CD\u8C03", enEmotionLabel: "Loves taking the opposite side of CZ.", emotion: { winStake: 0.2, lossStake: 0.12, winConfidence: -0.4, lossConfidence: -0.3 }, variance: 65, minConfidence: 68, baseStakePct: 10, maxStakePct: 20, required: ["atr", "spread", "priceChange", "ema", "orderbook", "odds"] },
          firstLady: { label: "\u4E00\u59D0", enLabel: "First Lady", description: "\u6CBF\u7528 CZ\u5927\u8868\u54E5\u7684\u8D8B\u52BF\u4E0E\u6D41\u52A8\u6027\u6846\u67B6\uFF0C\u4F46\u66F4\u679C\u65AD\u3001\u66F4\u6FC0\u8FDB\uFF1B\u53EA\u505A\u591A BTC \u548C BNB\u3002", enDescription: "Uses CZ Big Bro\u2019s trend and liquidity framework with a bolder, more aggressive temperament; long-only BTC and BNB.", actionUrge: 78, emotionSensitivity: 55, emotionLabel: "\u786E\u8BA4\u8D8B\u52BF\u540E\u66F4\u6562\u8FFD\u51FB", enEmotionLabel: "Presses harder once the trend is confirmed.", emotion: { winStake: 0.3, lossStake: -0.05, winConfidence: -0.4, lossConfidence: 0.3 }, variance: 55, minConfidence: 68, baseStakePct: 12, maxStakePct: 30, required: ["atr", "spread", "priceChange", "ema", "macd", "adx", "volume", "orderbook", "longReturns", "odds"] }
        };
        const decisionShapes = {
          liangXi: { confidence: { base: 48, scoreWeight: 5.5, varianceWeight: 0.015 }, stakeTiers: [50, 50, 50], tierConfidence: [80, 90], personalitySwing: 1 },
          fengShui: { confidence: { base: 49, scoreWeight: 5.3, varianceWeight: 0.02 }, stakeTiers: [10, 10, 10], tierConfidence: [70, 82], personalitySwing: 1.5 },
          diviner: { confidence: { base: 48, scoreWeight: 5.4, varianceWeight: 0.04 }, stakeTiers: [10, 10, 10], tierConfidence: [71, 83], personalitySwing: 2.5 },
          aggressive: { confidence: { base: 47, scoreWeight: 5.4, varianceWeight: 0.09 }, stakeTiers: [20, 40, 60], tierConfidence: [74, 86], personalitySwing: 5 },
          smart: { confidence: { base: 50, scoreWeight: 5.8, varianceWeight: 0.025 }, stakeTiers: [10, 20, 30], tierConfidence: [78, 88], personalitySwing: 2.2 },
          conservative: { confidence: { base: 52, scoreWeight: 5.5, varianceWeight: 0.01 }, stakeTiers: [5, 7, 10], tierConfidence: [84, 91], personalitySwing: 0.8 },
          trendFollowing: { confidence: { base: 48, scoreWeight: 5.6, varianceWeight: 0.025 }, stakeTiers: [8, 14, 20], tierConfidence: [78, 87], personalitySwing: 2.5 },
          meanReversion: { confidence: { base: 49, scoreWeight: 5.5, varianceWeight: 0.015 }, stakeTiers: [5, 10, 15], tierConfidence: [79, 88], personalitySwing: 2 },
          breakout: { confidence: { base: 47, scoreWeight: 6, varianceWeight: 0.035 }, stakeTiers: [8, 14, 20], tierConfidence: [78, 88], personalitySwing: 3 },
          orderFlow: { confidence: { base: 48, scoreWeight: 5.8, varianceWeight: 0.025 }, stakeTiers: [5, 10, 15], tierConfidence: [79, 88], personalitySwing: 2.2 },
          volatilityGuard: { confidence: { base: 52, scoreWeight: 5.5, varianceWeight: 8e-3 }, stakeTiers: [5, 7, 10], tierConfidence: [84, 91], personalitySwing: 0.6 },
          consensus: { confidence: { base: 50, scoreWeight: 6.1, varianceWeight: 0.015 }, stakeTiers: [5, 10, 15], tierConfidence: [82, 91], personalitySwing: 1.5 },
          priceAction: { confidence: { base: 48, scoreWeight: 5.9, varianceWeight: 0.03 }, stakeTiers: [7, 12, 20], tierConfidence: [78, 88], personalitySwing: 3 },
          czBrother: { confidence: { base: 49, scoreWeight: 5.8, varianceWeight: 0.02 }, stakeTiers: [8, 14, 20], tierConfidence: [78, 88], personalitySwing: 2 },
          contrarian: { confidence: { base: 50, scoreWeight: 5.7, varianceWeight: 0.02 }, stakeTiers: [6, 10, 15], tierConfidence: [80, 90], personalitySwing: 1.5 },
          showoff: { confidence: { base: 48, scoreWeight: 5.9, varianceWeight: 0.05 }, stakeTiers: [10, 15, 20], tierConfidence: [74, 86], personalitySwing: 3.5 },
          firstLady: { confidence: { base: 48, scoreWeight: 6, varianceWeight: 0.04 }, stakeTiers: [12, 20, 30], tierConfidence: [74, 85], personalitySwing: 3 }
        };
        profiles.fengShui.baseStakePct = profiles.diviner.baseStakePct = 10;
        Object.entries(profiles).forEach(([key, profile]) => Object.assign(profile, {
          key,
          allowAllIn: profile.allowAllIn ?? false,
          allInConfidence: profile.allInConfidence ?? 101,
          normalMaxStakePct: profile.normalMaxStakePct ?? profile.maxStakePct,
          actionUrge: profile.actionUrge ?? 50,
          emotionSensitivity: profile.emotionSensitivity ?? 0,
          emotion: profile.emotion || { winStake: 0, lossStake: 0, winConfidence: 0, lossConfidence: 0 },
          required: profile.required || [],
          recommended: profile.recommended || profile.required || defaultIndicators,
          confidence: decisionShapes[key]?.confidence || decisionShapes.smart.confidence,
          stakeTiers: decisionShapes[key]?.stakeTiers || decisionShapes.smart.stakeTiers,
          tierConfidence: decisionShapes[key]?.tierConfidence || decisionShapes.smart.tierConfidence,
          personalitySwing: decisionShapes[key]?.personalitySwing ?? decisionShapes.smart.personalitySwing
        }));
        const coreStrategies = ["aggressive", "smart", "conservative", "liangXi"];
        const characterStrategies = ["czBrother", "contrarian", "showoff", "firstLady"];
        const decisionStage = (strategy) => strategy === "contrarian" ? 2 : strategy === "showoff" ? 1 : 0;
        const supportsAsset = (strategy, coin) => !["czBrother", "firstLady"].includes(strategy) || ["BTC", "BNB"].includes(String(coin).replace(/USDT$/, ""));
        function peerPerformance(history, current, investedCapital) {
          const completed = history.filter((o) => ["WON", "LOST", "SPLIT"].includes(o.status)), window2 = completed.slice(0, 20);
          const financialRow = (o) => ["UP", "DOWN"].includes(o.direction) && Number.isFinite(o.amount) && o.amount > 0 && (Number.isFinite(o.payout) && o.payout >= 0 || o.status === "LOST" && o.payout == null) ? { ...o, profit: (o.payout ?? 0) - o.amount } : null;
          const recent = window2.map(financialRow), all = completed.map(financialRow);
          const rows = recent.filter(Boolean);
          const summarize = (items) => {
            const staked = items.reduce((sum, o) => sum + o.amount, 0), netProfit = items.reduce((sum, o) => sum + o.profit, 0);
            const wins = items.filter((o) => o.profit > 0).length, losses = items.filter((o) => o.profit < 0).length;
            return {
              count: items.length,
              staked,
              netProfit,
              returnPct: staked ? 100 * netProfit / staked : null,
              wins,
              losses,
              winRate: wins + losses ? wins / (wins + losses) : null,
              averageStake: items.length ? staked / items.length : null
            };
          };
          let afterLossBets = 0, afterLossRaises = 0;
          for (let i = 0; i < recent.length - 1; i++) if (recent[i] && recent[i + 1]?.profit < 0) {
            afterLossBets++;
            if (recent[i].amount > recent[i + 1].amount * 1.05) afterLossRaises++;
          }
          const up = rows.filter((o) => o.direction === "UP"), down = rows.filter((o) => o.direction === "DOWN");
          const cumulativeNetProfit = all.every(Boolean) ? all.reduce((sum, o) => sum + o.profit, 0) : null;
          const capitalLossPct = Number.isFinite(investedCapital) && investedCapital > 0 && cumulativeNetProfit !== null ? Math.max(0, -cumulativeNetProfit) / investedCapital * 100 : null;
          return {
            window: 20,
            complete: rows.length === window2.length,
            unknownCount: window2.length - rows.length,
            ...summarize(rows),
            investedCapital,
            cumulativeNetProfit,
            capitalLossPct,
            byDirection: { UP: summarize(up), DOWN: summarize(down) },
            habits: {
              upShare: rows.length ? up.length / rows.length : null,
              downShare: rows.length ? down.length / rows.length : null,
              afterLossBets,
              afterLossRaises,
              afterLossRaiseRate: afterLossBets ? afterLossRaises / afterLossBets : null,
              currentlyChasingLoss: Boolean(current && recent[0]?.profit < 0 && current.amount > recent[0].amount * 1.05)
            }
          };
        }
        function countertradeLossAssessment(peer) {
          const p = peer.performance, streak = Number(peer.lossStreak) || 0;
          const lossReturn = p?.complete !== false && p?.count >= 3 && p.netProfit < 0 ? p.returnPct : 0;
          const capitalLoss = Number.isFinite(p?.capitalLossPct) ? p.capitalLossPct : 0;
          const severity = capitalLoss >= 50 || lossReturn <= -60 || streak >= 4 ? 3 : capitalLoss >= 30 || lossReturn <= -35 || streak >= 3 ? 2 : capitalLoss >= 15 || lossReturn <= -15 || streak >= 2 ? 1 : 0;
          const side = p?.byDirection?.[peer.order?.direction];
          const repeatsLosingDirection = Boolean(p?.complete !== false && side?.count >= 3 && side.netProfit < 0 && side.winRate <= 0.4);
          return { severity, repeatsLosingDirection, chasingLoss: Boolean(p?.habits?.currentlyChasingLoss) };
        }
        function peerSnapshot(agents, roundId, asset, observedAt, initialBalance) {
          return { roundId: String(roundId), asset, observedAt, agents: agents.map((agent) => {
            const orders = agent.orders || [], history = orders.filter((o) => Number(o.start) < Number(roundId)).sort((a, b) => b.start - a.start);
            let lossStreak = 0;
            for (const o of history) {
              if (o.status !== "LOST" || !Number.isFinite(o.settledAt) || o.settledAt > observedAt) break;
              lossStreak++;
            }
            const current = orders.find((o) => String(o.start) === String(roundId) && o.status === "OPEN" && (!Number.isFinite(o.placedAt) || o.placedAt <= observedAt));
            const known = history.filter((o) => Number.isFinite(o.settledAt) && o.settledAt <= observedAt);
            const invested = Number.isFinite(initialBalance) && initialBalance > 0 ? initialBalance + (Number.isFinite(agent.addedCapital) ? agent.addedCapital : 0) : null;
            return { id: agent.id, name: agent.policy?.name, strategy: agent.policy?.strategy, lossStreak, performance: peerPerformance(known, current, invested), order: current ? { id: current.id, direction: current.direction, amount: current.amount } : null };
          }) };
        }
        function eligibleCountertradePeers(strategy, actionUrge, context = {}) {
          const requiredLosses = strategy === "showoff" ? 0 : Number(actionUrge) >= 100 ? 0 : Number(actionUrge) >= 70 ? 1 : 2;
          const peers = context.peers;
          const current = Boolean(peers && peers.roundId === String(context.roundId) && peers.asset === context.asset && Array.isArray(peers.agents));
          const candidates = current ? peers.agents.filter((a) => a.id !== context.agentId && a.order && ["UP", "DOWN"].includes(a.order.direction) && Number.isFinite(a.order.amount) && a.order.amount > 0 && (strategy === "showoff" ? a.strategy === "czBrother" : a.strategy !== "contrarian")) : [];
          const assessed = candidates.map((a) => ({ ...a, lossAssessment: countertradeLossAssessment(a) }));
          const useHistory = strategy === "contrarian" && assessed.some((a) => a.lossAssessment.severity > 0);
          const eligible = strategy === "showoff" || useHistory ? assessed : assessed.filter((a) => a.lossStreak >= requiredLosses);
          const amounts = eligible.map((a) => a.order.amount).sort((a, b) => a - b), middle = Math.floor(amounts.length / 2);
          const median = amounts.length ? amounts.length % 2 ? amounts[middle] : (amounts[middle - 1] + amounts[middle]) / 2 : 1;
          const targets = eligible.map((a) => {
            const loss = a.lossAssessment;
            const historyWeight = loss.severity ? 1 + loss.severity : a.performance?.complete !== false && a.performance?.count >= 3 && a.performance.netProfit >= 0 ? 0.5 : 1;
            const habitWeight = (loss.repeatsLosingDirection ? 1.25 : 1) * (loss.chasingLoss ? 1.15 : 1);
            return { ...a, voteWeight: useHistory ? historyWeight * habitWeight * clamp(Math.sqrt(a.order.amount / median), 0.5, 1.5) : a.order.amount };
          });
          const sum = (direction2, key) => targets.filter((a) => a.order.direction === direction2).reduce((s, a) => s + (key === "stake" ? a.order.amount : a.voteWeight), 0);
          const up = sum("UP"), down = sum("DOWN"), losers = targets.filter((a) => a.lossAssessment.severity > 0);
          const lossBreadth = targets.length ? losers.length / targets.length : 0, agreement = up + down ? Math.abs(up - down) / (up + down) : 0;
          const losingUp = losers.filter((a) => a.order.direction === "UP").reduce((s, a) => s + a.voteWeight, 0), losingDown = losers.filter((a) => a.order.direction === "DOWN").reduce((s, a) => s + a.voteWeight, 0);
          const losingAgreement = losingUp + losingDown ? Math.abs(losingUp - losingDown) / (losingUp + losingDown) : 0;
          const averageSeverity = losers.length ? losers.reduce((s, a) => s + a.lossAssessment.severity, 0) / losers.length : 0;
          let stakeMultiplier = 1;
          if (useHistory && losers.length >= 2 && lossBreadth >= 0.5 && agreement >= 0.5 && losingAgreement >= 0.5 && (up - down) * (losingUp - losingDown) > 0) {
            stakeMultiplier = lossBreadth >= 0.75 && averageSeverity >= 2.5 && agreement >= 0.75 ? 2 : lossBreadth >= 2 / 3 && averageSeverity >= 1.5 && agreement >= 0.6 ? 1.5 : 1.25;
          }
          return {
            current,
            requiredLosses,
            targets,
            up,
            down,
            upStake: sum("UP", "stake"),
            downStake: sum("DOWN", "stake"),
            mode: strategy === "showoff" ? "cz-only" : useHistory ? "loss-history" : "crowd-fallback",
            losingCount: losers.length,
            lossBreadth,
            agreement,
            losingAgreement,
            averageSeverity,
            stakeMultiplier
          };
        }
        function evaluateCharacter(strategy, snapshot = {}, actionUrge, context = {}) {
          if (!characterStrategies.includes(strategy)) return null;
          const wait = (reason) => ({ score: 0, factors: [{ name: "character_gate", value: reason, impact: "NEUTRAL" }], regime: "waiting" });
          const profile = profiles[strategy];
          if (!supportsAsset(strategy, context.asset)) return wait("BTC_BNB_ONLY");
          if (profile.required.filter((k) => k !== "odds").some((k) => !complete(snapshot[indicators[k].snapshotKey]))) return wait("MISSING_INPUT");
          if (snapshot.spread.basisPoints > 8 || snapshot.atr.percent > 1.2) return wait("MARKET_RISK");
          if (strategy === "czBrother" || strategy === "firstLady") {
            const bold = strategy === "firstLady", urge = clamp(Number(actionUrge ?? profile.actionUrge), 0, 100) / 100;
            const long = longHorizonContext(snapshot), p = snapshot.priceChangePct, e = snapshot.ema, a = snapshot.adx;
            const votes = [p.oneMinute > 0.01, p.fiveMinutes > 0.02, e.ema5 > e.ema20, snapshot.macd.histogram > 0, a.plusDI > a.minusDI, snapshot.spotOrderBookImbalance > 0.03, long.fifteen > 0, long.sixty > 0];
            const count = votes.filter(Boolean).length;
            const minimum = Math.ceil((bold ? 6 : 8) - urge * 4);
            const early = urge >= 0.7 && p.fiveMinutes > 0 && long.opposition(1) < 2;
            if (p.fiveMinutes <= 0 || !early && e.ema5 <= e.ema20 || long.opposition(1) > (bold ? 1 : urge >= 0.85 ? 1 : 0) || a.adx < (bold ? 22 : 28) - urge * 12 || snapshot.volumeRatio < (bold ? 1 : 1.1) - urge * 0.5 || count < minimum) return wait("WAIT_FOR_BULL_TREND");
            const probe = count < (bold ? 5 : 7) || e.ema5 <= e.ema20;
            return { score: probe ? 3 : count === 8 ? 6.5 : count >= 7 ? 6 : 5.2, probe, factors: [{ name: "long_only_trend", value: `${count}/8`, impact: "UP" }], regime: probe ? "long-only-probe" : "long-only" };
          }
          const collective = eligibleCountertradePeers(strategy, actionUrge ?? profile.actionUrge, context);
          const { current, targets, up, down } = collective;
          if (!current) return wait("NO_CURRENT_PEERS");
          if (!targets.length) return wait(strategy === "showoff" ? "CZ_NOT_BETTING" : "NO_LOSING_PEERS");
          if (Math.abs(up - down) < 1e-8) return wait("PEERS_TIED");
          const sign = up > down ? -1 : 1;
          return { score: sign * (5 + Math.abs(up - down) / (up + down)), probe: strategy === "contrarian" && collective.stakeMultiplier === 1 && targets.some((a) => a.lossStreak < 2), factors: [{ name: "peer_countertrade", value: JSON.stringify({ targets: targets.map((a) => ({ id: a.id, orderId: a.order.id, lossStreak: a.lossStreak, weight: a.voteWeight, severity: a.lossAssessment.severity })), up, down, losingCount: collective.losingCount, agreement: collective.agreement, stakeMultiplier: collective.stakeMultiplier }), impact: sign > 0 ? "UP" : "DOWN" }], regime: "countertrade" };
        }
        const divinationStrategies = ["fengShui", "diviner"];
        const oracleSymbols = [["\u4E7E", "Heaven"], ["\u5764", "Earth"], ["\u9707", "Thunder"], ["\u5DFD", "Wind"], ["\u574E", "Water"], ["\u79BB", "Fire"], ["\u826E", "Mountain"], ["\u5151", "Lake"]];
        const oracleElements = [["\u6728", "Wood"], ["\u706B", "Fire"], ["\u571F", "Earth"], ["\u91D1", "Metal"], ["\u6C34", "Water"]];
        const oracleCards = [["\u592A\u9633", "Sun", 1], ["\u6708\u4EAE", "Moon", -1], ["\u9AD8\u5854", "Tower", -1], ["\u661F\u661F", "Star", 1], ["\u6218\u8F66", "Chariot", 1], ["\u9690\u8005", "Hermit", 0], ["\u547D\u8FD0\u4E4B\u8F6E", "Wheel", 1], ["\u8282\u5236", "Balance", 0]];
        function describeOracleDraw(system, draw) {
          if (system === "fengShui") return {
            upper: { id: draw.upper, name: oracleSymbols[draw.upper][1] },
            lower: { id: draw.lower, name: oracleSymbols[draw.lower][1] },
            element: { id: draw.element, name: oracleElements[draw.element][1] }
          };
          return { cards: draw.cards.map(({ card, reversed }, index) => ({ id: card, name: oracleCards[card][1], position: ["backdrop", "present tension", "next action"][index], orientation: reversed ? "reversed" : "upright", gameVote: oracleCards[card][2] * (reversed ? -1 : 1) })) };
        }
        function canonical(value) {
          if (value && typeof value === "object") return Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : `{${Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical(value[key])).join(",")}}`;
          return JSON.stringify(value);
        }
        function evaluateDivination(strategy, snapshot = {}, { roundId, asset = "BTCUSDT", frozenReading = null, actionUrge = profiles[strategy]?.actionUrge } = {}) {
          if (!divinationStrategies.includes(strategy)) return null;
          const required = profiles[strategy].required;
          if (roundId == null || String(roundId) === "" || required.some((key) => !complete(snapshot[indicators[key].snapshotKey]))) return { score: 0, factors: [], regime: "missing", divination: null };
          const values = Object.fromEntries(required.map((key) => [key, snapshot[indicators[key].snapshotKey]]));
          let hash = 2166136261;
          for (const char of canonical({ version: 1, strategy, roundId: String(roundId), asset, values })) {
            hash ^= char.charCodeAt(0);
            hash = Math.imul(hash, 16777619);
          }
          let seed = (hash >>> 0).toString(16).padStart(8, "0");
          let state = hash >>> 0 || 1;
          const next = (n) => {
            state ^= state << 13;
            state ^= state >>> 17;
            state ^= state << 5;
            return (state >>> 0) % n;
          };
          let omen = 0, draw;
          if (frozenReading && frozenReading.system === strategy && frozenReading.roundId === String(roundId) && frozenReading.asset === asset) {
            seed = frozenReading.seed;
            draw = JSON.parse(JSON.stringify(frozenReading.draw));
            omen = frozenReading.omen === "UP" ? 1 : frozenReading.omen === "DOWN" ? -1 : 0;
          } else if (strategy === "fengShui") {
            const upper = next(8), lower = next(8), element = next(5);
            const symbolVote = [1, -1, 1, 1, -1, 1, 0, -1][upper] + [1, -1, 1, 1, -1, 1, 0, -1][lower];
            omen = Math.sign(symbolVote || [1, 1, 0, -1, -1][element]);
            draw = { upper, lower, element };
          } else {
            const deck = oracleCards.map((_, index) => index), cards = [];
            for (let index = 0; index < 3; index++) {
              const card = deck.splice(next(deck.length), 1)[0], reversed = Boolean(next(2));
              cards.push({ card, reversed });
              omen += oracleCards[card][2] * (reversed ? -1 : 1);
            }
            omen = Math.sign(omen);
            draw = { cards };
          }
          const votes = [direction(snapshot.priceChangePct.fiveMinutes, 0.02), direction(snapshot.rsi14 - 50, 4), direction(snapshot.ema.ema5 - snapshot.ema.ema20), direction(snapshot.spotOrderBookImbalance, 0.03)];
          const urge = clamp(Number(actionUrge) || 0, 0, 100);
          const marketVote = Math.sign(votes.reduce((sum, v) => sum + v, 0));
          const choice = omen || (urge >= 80 && votes.filter((v) => v === marketVote).length >= 2 ? marketVote : 0);
          const support = votes.filter((value) => choice && value === choice).length, opposition = votes.filter((value) => choice && value === -choice).length;
          const safe = snapshot.atr.percent <= 0.8 && snapshot.spread.basisPoints <= 8;
          const longOpposition = longHorizonContext(snapshot).opposition(choice);
          const aligned = Boolean(choice && safe && support >= 1 && opposition <= (urge >= 85 ? 3 : 2) && (longOpposition < 2 || support >= 2 && opposition <= 1));
          const probe = aligned && (!omen || opposition > 2);
          const divination = { version: 1, system: strategy, seed, roundId: String(roundId), asset, draw, draw_details: describeOracleDraw(strategy, draw), omen: omen > 0 ? "UP" : omen < 0 ? "DOWN" : "WAIT", verdict: aligned ? choice > 0 ? "UP" : "DOWN" : "WAIT", support, opposition, simulated: true };
          return {
            score: aligned ? choice * (4.4 + support * 0.3) : 0,
            probe,
            regime: aligned ? !omen ? "oracle-market-probe" : "oracle-aligned" : "oracle-wait",
            divination,
            factors: [{ name: "indicator_seed", value: seed, impact: "NEUTRAL" }, { name: "oracle", value: JSON.stringify(draw), impact: divination.omen === "WAIT" ? "NEUTRAL" : divination.omen }, { name: "market_alignment", value: `${support}/${votes.length}; opposed=${opposition}; safe=${safe}`, impact: aligned ? divination.verdict : "NEUTRAL" }]
          };
        }
        function formatDivination(reading, locale = "zh") {
          if (!reading) return "";
          const en = !String(locale).startsWith("zh"), pick = (item) => item[en ? 1 : 0];
          const draw = reading.system === "fengShui" ? `${pick(oracleSymbols[reading.draw.upper])} / ${pick(oracleSymbols[reading.draw.lower])} \xB7 ${pick(oracleElements[reading.draw.element])}` : reading.draw.cards.map(({ card, reversed }) => `${pick(oracleCards[card])}${en ? reversed ? " reversed" : " upright" : reversed ? "\u9006\u4F4D" : "\u6B63\u4F4D"}`).join(" \xB7 ");
          const finalVerdict = reading.finalVerdict || reading.verdict;
          const verdict = finalVerdict === "UP" ? en ? "UP" : "\u770B\u6DA8" : finalVerdict === "DOWN" ? en ? "DOWN" : "\u770B\u8DCC" : en ? "WAIT" : "\u89C2\u671B";
          return `${draw} \u2192 ${verdict}`;
        }
        const finite = (value) => Number.isFinite(Number(value));
        const complete = (value) => typeof value === "number" ? Number.isFinite(value) : Array.isArray(value) ? value.length > 0 && value.every(complete) : value !== null && typeof value === "object" && Object.keys(value).length > 0 && Object.values(value).every(complete);
        const direction = (value, deadband = 0) => finite(value) && Math.abs(Number(value)) > deadband ? Math.sign(Number(value)) : 0;
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        function longHorizonContext(snapshot = {}) {
          const returns = snapshot.longReturns || {};
          const fifteen = direction(returns.fifteenMinutes, 0.06), sixty = direction(returns.sixtyMinutes, 0.15);
          const bias = fifteen === sixty ? fifteen : fifteen === 0 ? sixty : sixty === 0 ? fifteen : 0;
          return {
            fifteen,
            sixty,
            bias,
            support: (sign) => [fifteen, sixty].filter((value) => value === sign).length,
            opposition: (sign) => [fifteen, sixty].filter((value) => value === -sign).length
          };
        }
        function effectiveActionUrge(personalValue, battleValue = 0) {
          const personal = clamp(Number.isFinite(Number(personalValue)) ? Math.round(Number(personalValue)) : 50, 0, 100);
          const battle = clamp(Number.isFinite(Number(battleValue)) ? Math.round(Number(battleValue)) : 0, 0, 100);
          return personal + (100 - personal) * battle / 100;
        }
        function evaluatePriceAction(strategy, candleWindow = {}, actionUrge) {
          if (strategy !== "priceAction") return null;
          const bars = Array.isArray(candleWindow?.bars) ? candleWindow.bars : [];
          if (bars.length < 8 || bars.some((bar) => ![bar.openTime, bar.closeTime, bar.open, bar.high, bar.low, bar.close].every(Number.isFinite))) return { score: 0, factors: [], regime: "missing" };
          const urge = bounded(actionUrge, profiles.priceAction.actionUrge, 0, 100) / 100, last = bars.at(-1), previous = bars.at(-2), recent = bars.slice(-3), prior = bars.slice(-9, -1);
          const shape = (bar) => {
            const range = bar.high - bar.low, body = bar.close - bar.open, absolute = Math.abs(body);
            return { sign: direction(body), range, body: absolute, bodyRatio: range > 0 ? absolute / range : 0, upper: bar.high - Math.max(bar.open, bar.close), lower: Math.min(bar.open, bar.close) - bar.low };
          };
          const latest = shape(last), before = shape(previous);
          const engulf = latest.sign > 0 && before.sign < 0 && last.open <= previous.close && last.close >= previous.open ? 1 : latest.sign < 0 && before.sign > 0 && last.open >= previous.close && last.close <= previous.open ? -1 : 0;
          const wick = latest.range > 0 && latest.bodyRatio <= 0.48 + urge * 0.12 && latest.lower >= Math.max(latest.body, latest.upper) * 1.8 ? 1 : latest.range > 0 && latest.bodyRatio <= 0.48 + urge * 0.12 && latest.upper >= Math.max(latest.body, latest.lower) * 1.8 ? -1 : 0;
          const priorHigh = Math.max(...prior.map((bar) => bar.high)), priorLow = Math.min(...prior.map((bar) => bar.low));
          const breakout = latest.bodyRatio >= 0.42 - urge * 0.12 && last.close > priorHigh ? 1 : latest.bodyRatio >= 0.42 - urge * 0.12 && last.close < priorLow ? -1 : 0;
          const upStructure = recent.every((bar, index) => !index || bar.close > recent[index - 1].close) && recent.at(-1).high > recent[0].high;
          const downStructure = recent.every((bar, index) => !index || bar.close < recent[index - 1].close) && recent.at(-1).low < recent[0].low;
          const structure = upStructure ? 1 : downStructure ? -1 : 0;
          const runBars = urge >= 0.35 ? recent.slice(-2) : recent;
          const run = runBars.every((bar) => shape(bar).sign > 0 && shape(bar).bodyRatio >= 0.3 - urge * 0.12) ? 1 : runBars.every((bar) => shape(bar).sign < 0 && shape(bar).bodyRatio >= 0.3 - urge * 0.12) ? -1 : 0;
          const averageBody = prior.reduce((sum, bar) => sum + shape(bar).body, 0) / prior.length;
          const drive = latest.bodyRatio >= 0.65 - urge * 0.12 && latest.body > 0 && latest.body >= averageBody * (1.15 - urge * 0.3) ? latest.sign : 0;
          const signals = [["engulfing", engulf, 2.6], ["rejection_wick", wick, 2.2], ["range_break", breakout, 2.6], ["three_bar_structure", structure, 1.5], ["candle_run", run, 1.8], ["body_drive", drive, 2.2]];
          const positive = signals.filter(([, sign]) => sign > 0).reduce((sum, [, , weight]) => sum + weight, 0), negative = signals.filter(([, sign]) => sign < 0).reduce((sum, [, , weight]) => sum + weight, 0);
          const vote = positive > negative ? 1 : negative > positive ? -1 : 0, support = Math.max(positive, negative), opposition = Math.min(positive, negative), minimum = 2.4 - urge * 1.1;
          const accepted = vote && support >= minimum && support - opposition >= 1.4 && opposition <= support * 0.6;
          const score = accepted ? vote * (support >= 5 ? 6 : support >= 3.5 ? 5.2 : 4.6) : 0;
          const factors = signals.map(([name, sign]) => ({ name, value: String(sign), impact: sign > 0 ? "UP" : sign < 0 ? "DOWN" : "NEUTRAL" }));
          factors.push({ name: "candle_interval_minutes", value: String(candleWindow.intervalMinutes), impact: "NEUTRAL" });
          return { score, factors, regime: accepted ? "raw-price-action" : "conflict-or-no-pattern" };
        }
        function evaluateCoreStrategy(strategy, snapshot = {}, actionUrge) {
          if (!coreStrategies.includes(strategy)) return null;
          if (strategy === "liangXi") {
            const signal = evaluateCoreStrategy("smart", snapshot, actionUrge);
            if (!signal.score) return signal;
            const sign = Math.sign(signal.score), price2 = snapshot.priceChangePct || {};
            const votes = [direction(price2.oneMinute, 0.01), direction(snapshot.spotOrderBookImbalance, 0.03), direction((snapshot.takerFlow?.buyRatio ?? 0.5) - 0.5, 0.04)];
            const aligned = votes.filter((v) => v === sign).length, opposed = votes.filter((v) => v === -sign).length;
            const long2 = longHorizonContext(snapshot);
            const accepted = aligned >= 2 && opposed === 0 && long2.opposition(sign) < 2;
            return {
              ...signal,
              score: accepted ? sign * Math.min(8, Math.abs(signal.score)) : 0,
              factors: [...signal.factors, { name: "liangxi_entry_confirmation", value: `${aligned}/3`, impact: accepted ? sign > 0 ? "UP" : "DOWN" : "NEUTRAL" }]
            };
          }
          const profile = profiles[strategy], urge = clamp(Number.isFinite(Number(actionUrge)) ? Number(actionUrge) : profile.actionUrge, 0, 100) / 100;
          const required = strategy === "aggressive" ? [snapshot.priceChangePct, snapshot.momentum, snapshot.roc, snapshot.volumeRatio, snapshot.takerFlow, snapshot.spotOrderBookImbalance, snapshot.longReturns] : strategy === "smart" ? [snapshot.priceChangePct, snapshot.rsi14, snapshot.ema, snapshot.macd, snapshot.adx, snapshot.bollinger, snapshot.atr, snapshot.volatility, snapshot.volumeRatio, snapshot.takerFlow, snapshot.spotOrderBookImbalance, snapshot.spread, snapshot.longReturns] : [snapshot.priceChangePct, snapshot.rsi14, snapshot.ema, snapshot.adx, snapshot.atr, snapshot.volatility, snapshot.spread, snapshot.spotOrderBookImbalance, snapshot.longReturns];
          if (required.some((value) => !complete(value))) {
            return { score: 0, factors: [], regime: "missing" };
          }
          const price = snapshot.priceChangePct || {}, ema = snapshot.ema || {}, long = longHorizonContext(snapshot), p1 = direction(price.oneMinute, 0.01), p5 = direction(price.fiveMinutes, 0.02), emaVote = direction(Number(ema.ema5) - Number(ema.ema20)), book = direction(snapshot.spotOrderBookImbalance, 0.03), rsiTrend = direction(Number(snapshot.rsi14) - 50, 4);
          const factors = [];
          const record = (name, value, vote, weight = 1) => {
            factors.push({ name, value: String(value), impact: vote > 0 ? "UP" : vote < 0 ? "DOWN" : "NEUTRAL" });
            return vote * weight;
          };
          let score = 0, regime = "fast";
          if (strategy === "aggressive") {
            const momentumVote = direction(snapshot.momentum), rocVote = direction(snapshot.roc.tenMinutes, 0.03), takerVote = direction(snapshot.takerFlow.buyRatio - 0.5, 0.04), volume = Number(snapshot.volumeRatio);
            score += record("price_1m", Number(price.oneMinute).toFixed(4), p1, 2.2);
            score += record("price_5m", Number(price.fiveMinutes).toFixed(4), p5, 1.2);
            score += record("momentum_10", Number(snapshot.momentum).toFixed(4), momentumVote, 1.4);
            score += record("roc_10", Number(snapshot.roc.tenMinutes).toFixed(4), rocVote, 1.2);
            score += record("taker_flow_5", Number(snapshot.takerFlow.buyRatio).toFixed(4), takerVote, 1.6);
            score += record("spot_book", Number(snapshot.spotOrderBookImbalance).toFixed(4), book, 1.4);
            score += record("return_15m", Number(snapshot.longReturns.fifteenMinutes).toFixed(4), long.fifteen, 0.45);
            score += record("return_60m", Number(snapshot.longReturns.sixtyMinutes).toFixed(4), long.sixty, 0.35);
            score *= clamp(volume, 0.8, 1.4);
            factors.push({ name: "volume_ratio", value: volume.toFixed(3), impact: "NEUTRAL" });
          } else if (strategy === "smart") {
            const macdVote = direction(snapshot.macd.histogram), dmiVote = direction(snapshot.adx.plusDI - snapshot.adx.minusDI), takerVote = direction(snapshot.takerFlow.buyRatio - 0.5, 0.04), volume = Number(snapshot.volumeRatio), riskOff = snapshot.spread.basisPoints > 8 || snapshot.atr.percent > 1.2 || snapshot.volatility.perMinutePct > 0.8, trendVotes = [p5, emaVote, macdVote, dmiVote, book, takerVote], up = trendVotes.filter((v) => v > 0).length, down = trendVotes.filter((v) => v < 0).length, trendDirection = up >= 4 && up > down ? 1 : down >= 4 && down > up ? -1 : 0, longAgainst = trendDirection ? long.opposition(trendDirection) : 0, trending = snapshot.adx.adx >= 24 && trendDirection !== 0 && longAgainst < 2;
            regime = riskOff ? "risk-off" : trending ? "trend" : snapshot.adx.adx < 24 ? "chop" : "conflict";
            factors.push({ name: "market_regime", value: regime, impact: "NEUTRAL" });
            if (regime === "trend") {
              score += record("price_5m", Number(price.fiveMinutes).toFixed(4), p5, 1.8);
              score += record("ema_5_20", `${Number(ema.ema5).toFixed(2)}/${Number(ema.ema20).toFixed(2)}`, emaVote, 1.8);
              score += record("macd_histogram", Number(snapshot.macd.histogram).toFixed(4), macdVote, 1.5);
              score += record("dmi", `${Number(snapshot.adx.plusDI).toFixed(2)}/${Number(snapshot.adx.minusDI).toFixed(2)}`, dmiVote, 1.2);
              score += record("spot_book", Number(snapshot.spotOrderBookImbalance).toFixed(4), book, 1.1);
              score += record("taker_flow_5", Number(snapshot.takerFlow.buyRatio).toFixed(4), takerVote, 1.1);
              score += record("rsi_14", Number(snapshot.rsi14).toFixed(2), rsiTrend, 0.5);
              score += record("return_15m", Number(snapshot.longReturns.fifteenMinutes).toFixed(4), long.fifteen, 0.8);
              score += record("return_60m", Number(snapshot.longReturns.sixtyMinutes).toFixed(4), long.sixty, 0.7);
            } else if (regime === "chop") {
              const rsiReversion = Number(snapshot.rsi14) <= 38 ? 1 : Number(snapshot.rsi14) >= 62 ? -1 : 0;
              const bandReversion = snapshot.bollinger.percentB <= 0.15 ? 1 : snapshot.bollinger.percentB >= 0.85 ? -1 : 0;
              const pullback = p1 === 0 ? 0 : -p1;
              score += record("rsi_reversion", Number(snapshot.rsi14).toFixed(2), rsiReversion, 1.8);
              score += record("bollinger_percent_b", Number(snapshot.bollinger.percentB).toFixed(4), bandReversion, 1.8);
              score += record("spot_book", Number(snapshot.spotOrderBookImbalance).toFixed(4), book, 1.4);
              score += record("taker_flow_5", Number(snapshot.takerFlow.buyRatio).toFixed(4), takerVote, 1.2);
              score += record("short_pullback", Number(price.oneMinute).toFixed(4), pullback, 0.8);
              score += record("return_15m", Number(snapshot.longReturns.fifteenMinutes).toFixed(4), long.fifteen, 0.35);
              score += record("return_60m", Number(snapshot.longReturns.sixtyMinutes).toFixed(4), long.sixty, 0.3);
            }
            factors.push({ name: "adx_14", value: Number(snapshot.adx.adx).toFixed(2), impact: "NEUTRAL" }, { name: "atr_percent", value: Number(snapshot.atr.percent).toFixed(4), impact: "NEUTRAL" }, { name: "realized_volatility", value: Number(snapshot.volatility.perMinutePct).toFixed(4), impact: "NEUTRAL" }, { name: "spread_bps", value: Number(snapshot.spread.basisPoints).toFixed(3), impact: "NEUTRAL" }, { name: "volume_ratio", value: volume.toFixed(3), impact: "NEUTRAL" });
          } else {
            const dmiVote = direction(snapshot.adx.plusDI - snapshot.adx.minusDI), votes = [p1, p5, emaVote, dmiVote, book, long.fifteen, long.sixty], up = votes.filter((value) => value > 0).length, down = votes.filter((value) => value < 0).length, calm = snapshot.atr.percent <= 0.5 && snapshot.volatility.perMinutePct <= 0.25 && snapshot.spread.basisPoints <= 3 && snapshot.adx.adx >= 18, vote = calm && down === 0 && up >= 6 && snapshot.rsi14 >= 48 && snapshot.rsi14 <= 70 ? 1 : calm && up === 0 && down >= 6 && snapshot.rsi14 <= 52 && snapshot.rsi14 >= 30 ? -1 : 0;
            regime = !calm ? "unsafe" : vote ? "mostly-aligned" : "conflict";
            score = vote * (Math.max(up, down) === 7 ? 6 : 5.6);
            record("price_1m", Number(price.oneMinute).toFixed(4), p1);
            record("price_5m", Number(price.fiveMinutes).toFixed(4), p5);
            record("ema_5_20", `${Number(ema.ema5).toFixed(2)}/${Number(ema.ema20).toFixed(2)}`, emaVote);
            record("dmi", `${Number(snapshot.adx.plusDI).toFixed(2)}/${Number(snapshot.adx.minusDI).toFixed(2)}`, dmiVote);
            record("spot_book", Number(snapshot.spotOrderBookImbalance).toFixed(4), book);
            record("rsi_14", Number(snapshot.rsi14).toFixed(2), rsiTrend);
            record("return_15m", Number(snapshot.longReturns.fifteenMinutes).toFixed(4), long.fifteen);
            record("return_60m", Number(snapshot.longReturns.sixtyMinutes).toFixed(4), long.sixty);
            factors.push({ name: "atr_percent", value: Number(snapshot.atr.percent).toFixed(4), impact: "NEUTRAL" }, { name: "realized_volatility", value: Number(snapshot.volatility.perMinutePct).toFixed(4), impact: "NEUTRAL" }, { name: "spread_bps", value: Number(snapshot.spread.basisPoints).toFixed(3), impact: "NEUTRAL" });
          }
          return { score, factors, regime };
        }
        function confidenceForScore(score, variance = 50, strategy = "smart") {
          const profile = profiles[strategy] || profiles.smart, curve = profile.confidence;
          return clamp(curve.base + Math.abs(Number(score) || 0) * curve.scoreWeight + (Number(variance) - 50) * curve.varianceWeight, 50, 97);
        }
        function stableUnit(value) {
          let hash = 2166136261;
          for (const char of canonical(value)) {
            hash ^= char.charCodeAt(0);
            hash = Math.imul(hash, 16777619);
          }
          return (hash >>> 0) / 4294967295;
        }
        function personalityNudge({ strategy = "smart", agentId = "", roundId = "", variance = 50, confidence = 50, minimumConfidence = 50 } = {}) {
          const profile = profiles[strategy] || profiles.smart, distance = Math.abs(Number(confidence) - Number(minimumConfidence));
          if (!agentId || roundId == null || distance > 7 || profile.personalitySwing <= 0) return 0;
          const willingness = clamp(Number(variance) || 0, 0, 100) / 100;
          const marginalWeight = 1 - distance / 7;
          return (stableUnit({ version: 1, strategy, agentId: String(agentId), roundId: String(roundId) }) * 2 - 1) * profile.personalitySwing * willingness * marginalWeight;
        }
        function emotionAdjustment({ strategy, actionUrge, emotionSensitivity, battleEmotion = 0, winStreak = 0, lossStreak = 0 } = {}) {
          const profile = profiles[strategy] || profiles.smart, urge = bounded(actionUrge, profile.actionUrge, 0, 100), sensitivity = bounded(emotionSensitivity, profile.emotionSensitivity, 0, 100), intensity = sensitivity / 100;
          const globalEmotion = bounded(battleEmotion, 0, 0, 100), globalIntensity = globalEmotion / 100;
          const wins = clamp(Math.floor(Number(winStreak) || 0), 0, 4), losses = clamp(Math.floor(Number(lossStreak) || 0), 0, 4), state = losses ? "loss" : wins ? "win" : "neutral", streak = state === "loss" ? losses : state === "win" ? wins : 0;
          const stakeRate = state === "loss" ? profile.emotion.lossStake : state === "win" ? profile.emotion.winStake : 0;
          const confidenceRate = state === "loss" ? profile.emotion.lossConfidence : state === "win" ? profile.emotion.winConfidence : 0;
          const personalityStakeMultiplier = clamp(1 + stakeRate * streak * intensity, 0.35, 2.5);
          const globalStakeRate = state === "loss" ? 0.8 : 0.6;
          const tiltPeriods = Math.max(1, streak);
          const globalStakeMultiplier = clamp(1 + globalStakeRate * tiltPeriods * globalIntensity, 1, 2.8);
          const stakeMultiplier = clamp(personalityStakeMultiplier * globalStakeMultiplier, 0.35, 2.5);
          const minimumConfidence = clamp(profile.minConfidence - urge * 0.08 + confidenceRate * streak * intensity - 2.5 * tiltPeriods * globalIntensity, 50, 99);
          return { state, streak, actionUrge: urge, sensitivity, battleEmotion: globalEmotion, personalityStakeMultiplier, globalStakeMultiplier, stakeMultiplier, minimumConfidence };
        }
        function capitalManagement({ strategy, balance, initialBalance, openStake = 0, recoveryActive = false }) {
          const equity = balance + openStake;
          if (!Number.isFinite(equity) || !Number.isFinite(initialBalance) || initialBalance <= 0 || balance < 0 || openStake < 0)
            return { recoveryActive: false, stakeMultiplier: 1, mode: "NORMAL" };
          const ratio = equity / initialBalance;
          const recovery = equity > 0 && equity < initialBalance && (recoveryActive === true || ratio <= 0.2);
          const cautious = ["conservative", "volatilityGuard"].includes(strategy);
          const stakeMultiplier = !recovery && cautious ? ratio >= 2 ? 0.7 : ratio >= 1.5 ? 0.8 : 1 : 1;
          return { recoveryActive: recovery, stakeMultiplier, mode: recovery ? "RECOVERY_ALL_IN" : stakeMultiplier < 1 ? "PROFIT_PROTECTION" : "NORMAL", capitalRatio: ratio, recoveryTarget: initialBalance };
        }
        function normalStakePercent({ strategy, baseStakePct, maxStakePct, balance, initialBalance, openStake = 0, recoveryActive = false, countertradeMultiplier = 1, confidence = 0, edge = 0, winStreak = 0, lossStreak = 0, emotionSensitivity, battleEmotion = 0 }) {
          const capital = capitalManagement({ strategy, balance, initialBalance, openStake, recoveryActive });
          if (capital.recoveryActive) return 100;
          if (strategy === "liangXi") return Number(maxStakePct) < 50 ? 0 : 50;
          const profile = profiles[strategy] || profiles.smart;
          const configuredBase = Number(baseStakePct) || profile.baseStakePct;
          const tiers = profile.stakeTiers.map((value) => value / profile.baseStakePct * configuredBase);
          const measuredConfidence = Number.isFinite(Number(confidence)) ? Number(confidence) : 0;
          let percent = measuredConfidence >= profile.tierConfidence[1] ? tiers[2] : measuredConfidence >= profile.tierConfidence[0] ? tiers[1] : tiers[0];
          percent *= emotionAdjustment({ strategy, emotionSensitivity, battleEmotion, winStreak, lossStreak }).stakeMultiplier;
          if (Number(battleEmotion) > 0) percent = Math.max(percent, probeStakePercent({ strategy, baseStakePct, maxStakePct, balance, battleEmotion }));
          if (Number.isFinite(balance) && balance > 0) percent = Math.max(percent, MIN_STAKE * 100 / balance);
          if (strategy === "contrarian") percent *= clamp(Number(countertradeMultiplier) || 1, 1, 2);
          const cap = Math.min(Number(maxStakePct) || profile.maxStakePct, profile.normalMaxStakePct);
          return Math.min(cap, Math.max(Number.isFinite(balance) && balance > 0 ? MIN_STAKE * 100 / balance : 0, Math.min(cap, percent) * capital.stakeMultiplier));
        }
        function probeStakePercent({ strategy, baseStakePct, maxStakePct, balance, initialBalance, openStake = 0, recoveryActive = false, battleEmotion = 0 }) {
          const capital = capitalManagement({ strategy, balance, initialBalance, openStake, recoveryActive });
          if (capital.recoveryActive) return 100;
          if (strategy === "liangXi") return Number(maxStakePct) < 50 ? 0 : 50;
          const profile = profiles[strategy] || profiles.smart;
          const tilt = bounded(battleEmotion, 0, 0, 100) / 100;
          const base = Math.min(5, Number(baseStakePct) || profile.baseStakePct);
          const high = { aggressive: 40, smart: 20, contrarian: 15, conservative: 7, volatilityGuard: 7 }[strategy] ?? profile.normalMaxStakePct;
          const percent = base + (high - base) * tilt;
          const minimum = Number.isFinite(balance) && balance > 0 ? MIN_STAKE * 100 / balance : 0;
          const cap = Math.min(Number(maxStakePct) || profile.maxStakePct, profile.normalMaxStakePct);
          return Math.min(cap, Math.max(minimum, Math.min(cap, percent) * capital.stakeMultiplier));
        }
        function allInRequirements({ strategy, battleEmotion = 0 }) {
          const profile = profiles[strategy] || profiles.smart, tilt = bounded(battleEmotion, 0, 0, 100) / 100;
          return {
            confidence: profile.allInConfidence - (strategy === "aggressive" ? 20 : strategy === "smart" ? 4 : 0) * tilt,
            minimumEdge: Number((0.2 - (strategy === "aggressive" ? 0.1 : 0) * tilt).toFixed(4)),
            requiredLossStreak: strategy === "aggressive" ? tilt >= 0.8 ? 0 : tilt >= 0.5 ? 1 : 2 : 0
          };
        }
        function strongCoreConsensus(snapshot = {}, choice, strategy = "smart") {
          const sign = choice === "UP" ? 1 : -1, price = snapshot.priceChangePct || {}, ema = snapshot.ema || {}, long = longHorizonContext(snapshot);
          const priceAligned = direction(price.oneMinute) === sign && direction(price.fiveMinutes) === sign;
          const bookAligned = direction(snapshot.spotOrderBookImbalance, 0.05) === sign, takerAligned = direction((snapshot.takerFlow?.buyRatio ?? 0.5) - 0.5, 0.05) === sign;
          if (strategy === "aggressive") {
            const momentumAligned = direction(snapshot.momentum) === sign, rocAligned = direction(snapshot.roc?.tenMinutes, 0.03) === sign;
            return priceAligned && long.support(sign) >= 1 && long.opposition(sign) === 0 && [priceAligned, bookAligned, takerAligned, momentumAligned, rocAligned].filter(Boolean).length >= 4;
          }
          const emaAligned = direction(Number(ema.ema5) - Number(ema.ema20)) === sign, macdAligned = direction(snapshot.macd?.histogram) === sign, dmiAligned = direction((snapshot.adx?.plusDI || 0) - (snapshot.adx?.minusDI || 0)) === sign;
          return priceAligned && bookAligned && long.support(sign) >= 1 && long.opposition(sign) === 0 && snapshot.adx?.adx >= 22 && snapshot.spread?.basisPoints <= 5 && [priceAligned, emaAligned, macdAligned, dmiAligned, bookAligned, takerAligned].filter(Boolean).length >= 5;
        }
        const outputSchema = '{"round_id":"","action":"BET|SKIP","direction":"UP|DOWN|null","stake_usdt":0,"stake_pct":0,"confidence":0,"risk_mode":"NORMAL|ADD_ON|ALL_IN|WAIT","skip_reason_code":"MODEL_UNCERTAIN|STRATEGY_BLOCKED|NO_ELIGIBLE_PEERS|ORACLE_WAIT|null","factors":[{"name":"","value":"","impact":"UP|DOWN|NEUTRAL"}],"reason":"max 80 chars","data_fresh":true,"warnings":[]}';
        const bounded = (value, fallback, min, max) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Math.round(Number(value)))) : fallback;
        function buildDecisionPrompt(value = {}) {
          const strategy = Object.hasOwn(profiles, value.strategy) ? value.strategy : value.profile?.key || "smart";
          const profile = profiles[strategy] || profiles.smart;
          const variance = bounded(value.decisionVariance ?? value.decision_variance ?? value.variance, profile.variance, 0, 100);
          const actionUrge = bounded(value.actionUrge ?? value.action_urge, profile.actionUrge, 0, 100);
          const personalActionUrge = bounded(value.personalActionUrge ?? value.personal_action_urge, actionUrge, 0, 100);
          const battleActionUrge = bounded(value.battleActionUrge ?? value.battle_action_urge, 0, 0, 100);
          const emotionSensitivity = bounded(value.emotionSensitivity ?? value.emotion_sensitivity, profile.emotionSensitivity, 0, 100);
          const battleEmotion = bounded(value.battleEmotion ?? value.battle_emotion, 0, 0, 100);
          const suppliedEmotionState = ["win", "loss", "neutral"].includes(value.emotionState ?? value.emotion_state) ? value.emotionState ?? value.emotion_state : "neutral";
          const suppliedEmotionStreak = bounded(value.emotionStreak ?? value.emotion_streak, 0, 0, 4);
          const calculatedEmotion = emotionAdjustment({
            strategy,
            actionUrge,
            emotionSensitivity,
            battleEmotion,
            winStreak: suppliedEmotionState === "win" ? suppliedEmotionStreak : 0,
            lossStreak: suppliedEmotionState === "loss" ? suppliedEmotionStreak : 0
          });
          const emotionStakeMultiplier = Number.isFinite(Number(value.emotionStakeMultiplier ?? value.emotion_stake_multiplier)) ? clamp(Number(value.emotionStakeMultiplier ?? value.emotion_stake_multiplier), 0.35, 2.5) : calculatedEmotion.stakeMultiplier;
          const effectiveMinimumConfidence = Number.isFinite(Number(value.effectiveMinimumConfidence ?? value.effective_minimum_confidence)) ? clamp(Number(value.effectiveMinimumConfidence ?? value.effective_minimum_confidence), 50, 99) : calculatedEmotion.minimumConfidence;
          const recovery = value.capital_recovery === true;
          const maxStakePct = recovery ? 100 : bounded(value.maxStakePct ?? value.max_stake_pct, profile.maxStakePct, 5, profile.maxStakePct);
          const allowAllIn = recovery || profile.allowAllIn && maxStakePct === 100 && (value.allowAllIn ?? value.allow_all_in) !== false;
          const requested = Array.isArray(value.indicatorFields) ? value.indicatorFields : Array.isArray(value.indicators) ? value.indicators : profile.recommended;
          const fieldNames = new Set(Object.values(indicators).map((item) => item.field));
          const selectedFields = [...new Set(requested.map((key) => indicators[key]?.field || key).filter((key) => fieldNames.has(key)))];
          const requiredFields = profile.required.map((key) => indicators[key].field);
          const asset = String(value.asset || (value.coin ? `${value.coin}USDT` : "BTCUSDT")).toUpperCase();
          const timeframe = ["5m", "15m", "1h", "1d"].includes(String(value.timeframe || "").toLowerCase()) ? String(value.timeframe).toLowerCase() : "5m";
          const timeframeLabel = { "5m": "five-minute", "15m": "fifteen-minute", "1h": "one-hour", "1d": "one-day" }[timeframe];
          const strategyRule = profile.enDescription;
          const allIn = allInRequirements({ strategy, battleEmotion });
          const highProbe = probeStakePercent({ strategy, maxStakePct, battleEmotion: 100 });
          const allInRule = recovery ? "RECOVERY_ALL_IN is active. Every permitted BET must use the full available balance rounded down to cents and risk_mode=ALL_IN. This replaces the normal/probe amount caps and ordinary ALL_IN eligibility checks (strong consensus, extra edge and loss streak); direction permissions, data freshness, minimum confidence and positive edge still apply. In this paper-only recovery mode, the full balance may be below 5 USDT but must be at least 0.01 USDT. This is the sole minimum-stake exception. SKIP remains valid when no bet is permitted. Losses are not evidence of an advantage." : allowAllIn ? `ALL_IN requires max_stake_pct=100, confidence >= ${allIn.confidence}, estimated edge >= ${allIn.minimumEdge}, loss_streak >= ${allIn.requiredLossStreak}, and the strategy's own strong-consensus gate. ${strategy === "aggressive" ? "10U Warrior requires aligned short returns plus at least three of momentum, ROC, taker flow and order book." : "Super AI requires a strong ADX trend with aligned returns, EMA, MACD, DMI, flow and order book, plus spread <= 5 bps."} The loss-streak requirement is only an eligibility condition, never evidence of an advantage. ALL_IN means the full available balance rounded down to cents. ${strategy === "aggressive" && battleEmotion >= 80 ? "At high tilt, prefer ALL_IN over a small normal bet when ALL supplied ALL_IN conditions are satisfied by your honest confidence; no previous loss is required. Never raise confidence just to qualify." : ""}` : "ALL_IN is disabled. Never return risk_mode=ALL_IN or stake 95% or more of the available balance.";
          return [
            `You are the ${timeframeLabel} Up/Down paper-betting decision engine for ${asset} in 10U Warrior.`,
            "This is paper betting only. You cannot call tools, wallets, or order APIs.",
            "Use only the supplied JSON snapshot. Never invent missing values.",
            `Selected strategy: ${profile.enLabel} (${strategy}).`,
            `Strategy rule: ${strategyRule}`,
            ...strategy === "liangXi" ? [
              "This is a game interpretation of publicly described short-term, bidirectional, heavy-stake rolling behavior, not an authenticated strategy or impersonation. No measured accuracy is claimed. Read short pressure and turning points with flow confirmation; never force a short merely because the persona is known for shorting.",
              "LIANG_XI sizing overrides all ordinary ladders, minimum top-ups, probes and emotion multipliers: each BET must be exactly 50% (NORMAL) or 100% (ALL_IN) of available paper balance, rounded down to cents. Never use ADD_ON, 5%, 20%, 75%, or an arbitrary amount. Half below the ordinary minimum means SKIP unless a full-balance bet independently qualifies. The two sizes are game rules requested by the user, not documented rules used by the real person.",
              "After a settled win or loss, the supplied emotion threshold falls sharply, making subsequent rounds easier to enter. Reassess direction on fresh evidence every round and switch sides when justified. Repeated entries mean subsequent eligible rounds, never duplicate bets in one round. Missing data, conflicting direction and nonpositive edge still require SKIP."
            ] : [],
            ...characterStrategies.includes(strategy) ? [
              "Fictional game persona, never claim to be or represent the real person.",
              ["czBrother", "firstLady"].includes(strategy) ? "BET only UP on BTCUSDT or BNBUSDT. Evaluate your own trend and liquidity conditions. You do not require any peer order or any peer loss streak." : strategy === "showoff" ? "Use only actual same-round czBrother orders in input.peers. Fade their stake-weighted direction; ties or no valid target require SKIP. No peer loss streak is required." : "Use only actual same-round non-Contrarian orders in input.peers. Combine all eligible peers using the supplied loss-history vote weights; never pick just one target. Inspect each peer\u2019s performance over at most 20 settled bets, net return, cumulative realized capital loss, directional outcomes and loss-chasing habits. Unsettled stakes are not realized losses. Fade the program-verified weighted majority. Only collective losses involving at least two losing current bettors, broad losses and aligned votes permit the supplied 1.25x, 1.5x or 2x stake multiplier. One losing person alone, or split directions, must not trigger collective escalation. If no material loss evidence exists, use the program-supplied crowd fallback and its action-urge loss-streak requirements. Ties or no eligible targets require SKIP. Missing payout data is unknown, not a loss. These histories are descriptions, not proof that a peer will lose again; keep confidence honest.",
              "Market-risk, positive-edge and hard caps still apply."
            ] : [],
            ...divinationStrategies.includes(strategy) ? [
              strategy === "fengShui" ? "Persona: You are the Feng Shui Master. Explain the supplied upper/lower oracle symbols and element as an imaginative market landscape." : "Persona: You are the Diviner. Read the supplied three cards in order as backdrop, present tension and next action; consider each upright/reversed position.",
              "Use input.divination.draw_details for exact symbol, element and card names. Numeric IDs are game-specific, not traditional numbering. Copy these names faithfully; reversed cards do not all have the same vote. Interpret the supplied gameVote and frozen verdict, never invent a mapping.",
              "input.divination is a frozen, indicator-seeded entertainment draw. Never reroll, replace cards, claim supernatural accuracy, or describe its random seed as a calibrated probability. Explain the draw together with the supplied market indicators in reason, then decide BET or SKIP. You may always SKIP. BET must follow input.divination.verdict; WAIT forbids BET. At action_urge >= 80 a neutral original omen may have a directional market-led verdict; keep the original cards and explain the market-led small probe. Do not bypass the existing risk gate.",
              "Return divination with seed copied exactly from input.divination.seed, reading containing a short in-character interpretation (max 160 chars), and verdict equal to UP/DOWN for BET or WAIT for SKIP. Include ENTERTAINMENT_ONLY in warnings."
            ] : [],
            `Action urge: personal_action_urge=${personalActionUrge}/100; battle_action_urge=${battleActionUrge}/100; effective action_urge=${actionUrge}/100. The shared battle value raises every Agent toward 100 without erasing its personal baseline. A higher effective value may accept a weaker but still directional strategy signal and lowers the supplied minimum-confidence threshold by up to 8 points. It never creates a direction, overrides missing or stale data, accepts excessive market risk, removes the positive-edge check, or exceeds stake caps. SKIP remains a normal valid action in every round.`,
            `Emotion rule: ${profile.enEmotionLabel} emotion_sensitivity=${emotionSensitivity}/100. battle_emotion=${battleEmotion}/100 applies from the first round: even without past results it raises the normal stake multiplier by up to 60% and lowers the confidence floor by up to 2.5 points. Win/loss streaks amplify this shared tilt, including for cautious strategies. It may change only the supplied minimum-confidence threshold and normal stake multiplier; it must never change direction, bypass market entry conditions, or exceed a hard stake cap.`,
            `Current emotion adjustment: state=${calculatedEmotion.state}; streak=${calculatedEmotion.streak}; personality_stake_multiplier=${calculatedEmotion.personalityStakeMultiplier.toFixed(3)}; shared_tilt_multiplier=${calculatedEmotion.globalStakeMultiplier.toFixed(3)}; normal_stake_multiplier=${emotionStakeMultiplier.toFixed(3)}; effective_minimum_confidence=${effectiveMinimumConfidence.toFixed(2)}. Follow these supplied values exactly.`,
            `Probe sizing follows this personality's battle_emotion curve: the ordinary 5% budget rises linearly to ${highProbe}% at 100, subject to normal_stake_cap and max_stake_pct, with a ${MIN_STAKE} USDT minimum only when those hard caps and balance allow it. Normal stake sizing is at least this personality's current probe budget when permitted by hard caps. The supplied execution permissions and exact stake choices are authoritative.`,
            ...battleEmotion >= 70 ? ["High-tilt decision preference: when a direction is permitted and your honest confidence clears the supplied minimum and positive-edge checks, prefer acting with the supplied normal or probe stake. A permitted probe does not need strong-signal consensus. Do not default to the minimum amount or wait for perfect alignment merely out of generic caution. SKIP remains valid for a specific uncertainty or unmet condition; explain it. Never inflate confidence or override a fixed direction, countertrade prerequisite, frozen oracle, or hard cap."] : [],
            `Selected indicator fields: ${selectedFields.join(", ")}.`,
            `Required indicator fields: ${requiredFields.length ? requiredFields.join(", ") : "none beyond the selected fields"}.`,
            `Policy limits: decision_variance=${variance}; personal_action_urge=${personalActionUrge}; battle_action_urge=${battleActionUrge}; action_urge=${actionUrge}; emotion_sensitivity=${emotionSensitivity}; battle_emotion=${battleEmotion}; minimum_confidence=${profile.minConfidence}; effective_minimum_confidence=${effectiveMinimumConfidence.toFixed(2)}; base_stake_pct=${profile.baseStakePct}; normal_stake_cap=${recovery ? 100 : Math.min(profile.normalMaxStakePct, maxStakePct)}; max_stake_pct=${maxStakePct}; allow_all_in=${allowAllIn}.`,
            `Normal stake ladder for this personality: ${profile.stakeTiers[0]}% below ${profile.tierConfidence[0]} confidence; ${profile.stakeTiers[1]}% from ${profile.tierConfidence[0]} to below ${profile.tierConfidence[1]}; ${profile.stakeTiers[2]}% from ${profile.tierConfidence[1]} upward. Apply the supplied emotion multiplier and a minimum stake of ${MIN_STAKE} USDT, then obey normal_stake_cap and max_stake_pct. For Contrarian, also apply the program-supplied collective countertrade stake multiplier before the hard caps; never invent a multiplier. If the balance or either cap cannot cover the minimum, SKIP. Do not substitute another personality's ladder.`,
            ...strategy === "priceAction" ? [
              "raw_candles contains the latest 20 fully closed OHLC bars. Read only open, high, low, close, candle order and the supplied market odds. Do not infer or use RSI, MACD, moving averages, order book, volume, news or any hidden indicator.",
              "Look for visible engulfing candles, rejection wicks, two-candle runs, forceful candle bodies and breaks of recent highs or lows. One clear strong pattern can be enough; do not require several confirmations. Weak shapes or strong opposing patterns require SKIP."
            ] : [
              "price_change_pct compares completed one-minute candle closes over exactly 1 and 5 minutes. RSI uses Wilder smoothing on completed candles.",
              "All technical windows use completed 1m candles, not 5m candles. returns_15_60 compares completed closes over 15 and 60 minutes and is mandatory long-horizon context for these indicator strategies. VWAP is rolling 20m quote volume / base volume, not a daily session VWAP. Realized volatility is the population standard deviation of 20 one-minute log returns in percent, not annualized. Donchian excludes the decision candle. OBV is a 20m signed-volume change, not lifetime OBV. Spread and microprice use current top-of-book; taker flow aggregates completed 5 minutes."
            ],
            "Follow only the selected strategy rule. Never substitute another strategy when its prerequisites fail. Related indicators are correlated, not independent confirmations. The local execution permissions supplied with an independent model review are authoritative: they may admit a small probe at high action urge. Preserve long-only, countertrade, and frozen-oracle contracts.",
            "confidence is your uncalibrated estimate of the chosen direction probability in percent; it is not a measured win rate. Estimated edge = confidence / 100 * odds - 1, before fees.",
            "Shared capital sizing: at or below 20% of cumulative invested capital, enter persistent RECOVERY_ALL_IN until funds recover to invested capital. Unsettled stakes are part of funds. For conservative and volatilityGuard, at 1.5x invested capital reduce the usual stake percentage by 20%, at 2x reduce it by 30%; minimum stake and caps still apply. Runtime capital mode and exact stake choices override the static amount ladder only; they never change directional prerequisites.",
            allInRule,
            "decision_variance affects willingness to change a marginal decision. action_urge affects how much valid directional evidence is needed to act. Neither can bypass freshness, balance, positive edge, hard risk checks or stake caps. Losses alone are never evidence of an advantage.",
            "Use JSON numbers, not strings, booleans or null, for stake_usdt, stake_pct and confidence. SKIP requires direction=null, both stakes=0 and risk_mode=WAIT. Echo round_id as a string.",
            "Return SKIP when data is stale, contradictory, below minimum confidence, missing a selected or required indicator, or has no positive expected value.",
            "Return exactly one JSON object with these fields and no Markdown:",
            divinationStrategies.includes(strategy) ? JSON.stringify({ ...JSON.parse(outputSchema), divination: { seed: "", reading: "", verdict: "UP|DOWN|WAIT" } }) : outputSchema
          ].join("\n");
        }
        return { MIN_STAKE, capitalManagement, indicators, profiles, defaultIndicators, coreStrategies, characterStrategies, decisionStage, supportsAsset, peerSnapshot, eligibleCountertradePeers, evaluateCharacter, divinationStrategies, evaluateDivination, formatDivination, evaluatePriceAction, effectiveActionUrge, longHorizonContext, evaluateCoreStrategy, confidenceForScore, personalityNudge, emotionAdjustment, normalStakePercent, probeStakePercent, allInRequirements, strongCoreConsensus, buildDecisionPrompt };
      });
    }
  });

  // mobile/http.cjs
  var require_http = __commonJS({
    "mobile/http.cjs"(exports, module) {
      async function nativeFetch(input, options = {}) {
        const url = new URL(String(input));
        if (url.protocol !== "https:" || url.username || url.password) throw Error("MOBILE_HTTPS_REQUIRED");
        const plugin = globalThis.Capacitor?.Plugins?.CapacitorHttp;
        if (!plugin?.request) throw Error("MOBILE_NETWORK_UNAVAILABLE");
        const signal = options.signal;
        signal?.throwIfAborted();
        let timer, onAbort;
        const cancelled = new Promise((_, reject) => {
          onAbort = () => reject(signal?.reason || new DOMException("Aborted", "AbortError"));
          signal?.addEventListener("abort", onAbort, { once: true });
          timer = setTimeout(() => reject(new DOMException("Timed out", "TimeoutError")), 2e4);
        });
        try {
          const result = await Promise.race([cancelled, plugin.request({
            url: url.href,
            method: options.method || "GET",
            headers: Object.fromEntries(new Headers(options.headers || {}).entries()),
            ...options.body == null ? {} : { data: JSON.parse(options.body) },
            connectTimeout: 8e3,
            readTimeout: 15e3,
            disableRedirects: true,
            responseType: "json"
          })]);
          signal?.throwIfAborted();
          if (result.status >= 300 && result.status < 400) throw Error("MOBILE_REDIRECT_REJECTED");
          return new Response([204, 205, 304].includes(result.status) ? null : JSON.stringify(result.data), {
            status: result.status,
            headers: { "content-type": "application/json" }
          });
        } finally {
          clearTimeout(timer);
          signal?.removeEventListener("abort", onAbort);
        }
      }
      module.exports = { nativeFetch, aiFetch: nativeFetch };
    }
  });

  // ai-decision.js
  var require_ai_decision = __commonJS({
    "ai-decision.js"(exports, module) {
      var crypto = require_crypto2();
      var DECISION_META = Symbol("trusted-decision-metadata");
      var { alignRoundDirection } = require_round_direction();
      var {
        MIN_STAKE,
        capitalManagement,
        indicators: indicatorCatalog,
        profiles: PROFILE_RULES,
        defaultIndicators: DEFAULT_INDICATORS,
        effectiveActionUrge,
        longHorizonContext,
        evaluateCoreStrategy,
        evaluateCharacter,
        eligibleCountertradePeers,
        evaluatePriceAction,
        divinationStrategies,
        evaluateDivination,
        formatDivination,
        confidenceForScore,
        personalityNudge,
        emotionAdjustment,
        normalStakePercent,
        probeStakePercent,
        allInRequirements,
        strongCoreConsensus,
        buildDecisionPrompt
      } = require_strategy_catalog();
      var INDICATORS = Object.keys(indicatorCatalog);
      var DEFAULT_AGENT_POLICIES = {
        A: { id: "A", name: "\u72D0\u706B\u672F\u5E08", provider: "claude", coin: "BTC", strategy: "aggressive", decisionVariance: 82, actionUrge: 85, emotionSensitivity: 90, maxStakePct: 100, allowAllIn: true, indicators: PROFILE_RULES.aggressive.recommended },
        B: { id: "B", name: "\u661F\u73AF\u673A\u7532", provider: "gpt", coin: "BTC", strategy: "smart", decisionVariance: 45, actionUrge: 60, emotionSensitivity: 15, maxStakePct: 100, allowAllIn: true, indicators: PROFILE_RULES.smart.recommended },
        C: { id: "C", name: "\u6DF1\u6D77\u7075\u517D", provider: "deepseek", coin: "BTC", strategy: "conservative", decisionVariance: 18, actionUrge: 35, emotionSensitivity: 60, maxStakePct: 10, allowAllIn: false, indicators: PROFILE_RULES.conservative.recommended }
      };
      function decisionError(code, statusCode = 422) {
        return Object.assign(new Error(code), { code, statusCode });
      }
      function boundedInteger(value, fallback, min, max) {
        const number = Number(value);
        return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
      }
      function normalizePolicy(value, id) {
        const fallback = DEFAULT_AGENT_POLICIES[id] || {
          id,
          name: `AI ${id}`,
          provider: "gpt",
          coin: "BTC",
          strategy: "smart",
          decisionVariance: 45,
          actionUrge: 60,
          emotionSensitivity: 15,
          maxStakePct: 100,
          allowAllIn: true,
          indicators: PROFILE_RULES.smart.recommended
        };
        const strategy = Object.hasOwn(PROFILE_RULES, value?.strategy) ? value.strategy : fallback.strategy;
        const rules = PROFILE_RULES[strategy];
        const savedIndicators = Array.isArray(value?.indicators) ? [...new Set(value.indicators.filter((key) => INDICATORS.includes(key)))] : null;
        const legacyCoreDefaults = ["aggressive", "smart", "conservative"].includes(strategy) && savedIndicators?.length === DEFAULT_INDICATORS.length && DEFAULT_INDICATORS.every((key) => savedIndicators.includes(key));
        const requestedIndicators = !savedIndicators || legacyCoreDefaults ? rules.recommended : savedIndicators;
        const indicators = [.../* @__PURE__ */ new Set([...requestedIndicators.length >= 3 ? requestedIndicators : rules.recommended, ...rules.required])];
        const configuredCap = boundedInteger(value?.maxStakePct, fallback.maxStakePct, 5, 100);
        const maxStakePct = rules.fixedStakeChoices ? 100 : Math.min(configuredCap, rules.maxStakePct);
        const requestedCoin = String(value?.coin || fallback.coin || "BTC").toUpperCase();
        if (value?.aiConnectionId !== void 0 && !["none", "deepseek", "openai", "anthropic", "custom"].includes(value.aiConnectionId)) throw decisionError("AI_CONNECTION_NOT_TESTED");
        return {
          id,
          ...value?.sourceAgentId ? { sourceAgentId: String(value.sourceAgentId).slice(0, 60), aiModelLabel: String(value.aiModelLabel || "").slice(0, 160) } : {},
          ...value?.aiConnectionId !== void 0 ? { aiConnectionId: value.aiConnectionId, aiConnectionRevision: typeof value.aiConnectionRevision === "string" ? value.aiConnectionRevision : null } : {},
          name: String(value?.name || fallback.name).trim().slice(0, 18) || fallback.name,
          provider: ["claude", "gpt", "deepseek"].includes(value?.provider) ? value.provider : fallback.provider,
          skinId: typeof value?.skinId === "string" ? value.skinId : "anime-female",
          coin: ["BTC", "ETH", "BNB"].includes(requestedCoin) ? requestedCoin : "BTC",
          strategy,
          decisionVariance: boundedInteger(value?.decisionVariance, rules.variance, 0, 100),
          actionUrge: boundedInteger(value?.actionUrge, rules.actionUrge, 0, 100),
          emotionSensitivity: boundedInteger(value?.emotionSensitivity, rules.emotionSensitivity, 0, 100),
          maxStakePct,
          allowAllIn: rules.allowAllIn && maxStakePct === 100 && (rules.fixedStakeChoices || value?.allowAllIn !== false) ? true : false,
          indicators,
          minConfidence: rules.minConfidence,
          baseStakePct: rules.baseStakePct,
          allInConfidence: rules.allInConfidence
        };
      }
      function normalizeAgentPolicies(value) {
        const list = Array.isArray(value?.agents) ? value.agents : Array.isArray(value) ? value : [];
        return Object.fromEntries(["A", "B", "C"].map((id, index) => [id, normalizePolicy(list.find((item) => item?.id === id) || list[index], id)]));
      }
      function selectedIndicators(snapshot, selected = INDICATORS) {
        const result = {};
        for (const key of selected) {
          const definition = indicatorCatalog[key];
          if (!definition) throw decisionError("AI_INDICATOR_MISSING");
          result[definition.field] = completeIndicator(snapshot[definition.snapshotKey]) ? snapshot[definition.snapshotKey] : null;
        }
        return result;
      }
      function completeIndicator(value) {
        if (typeof value === "number") return Number.isFinite(value);
        if (Array.isArray(value)) return value.length > 0 && value.every(completeIndicator);
        return value !== null && typeof value === "object" && Object.keys(value).length > 0 && Object.values(value).every(completeIndicator);
      }
      function assertDecisionInputs(input) {
        if (Object.values(input.indicators).some((value) => !completeIndicator(value)) || (input.policy.required_indicators || []).some((field) => !completeIndicator(input.indicators[field]))) throw decisionError("AI_INDICATOR_MISSING");
      }
      function buildDecisionContext({ market, indicators, account, policy, battleEmotion = 0, battleActionUrge = 0, peers = null, frozenDivination = null }) {
        const capital = capitalManagement({ strategy: policy.strategy, ...account, recoveryActive: account.capitalRecovery });
        const personalActionUrge = policy.actionUrge;
        const actionUrge = effectiveActionUrge(personalActionUrge, battleActionUrge);
        const emotion = emotionAdjustment({ strategy: policy.strategy, actionUrge, emotionSensitivity: policy.emotionSensitivity, battleEmotion, winStreak: account.winStreak, lossStreak: account.lossStreak });
        const countertrade = eligibleCountertradePeers(policy.strategy, actionUrge, { agentId: policy.id, roundId: market.roundId, asset: `${policy.coin}USDT`, peers });
        return {
          ...peers ? { peers: structuredClone(policy.strategy === "contrarian" ? peers : { ...peers, agents: peers.agents.map(({ performance, ...peer }) => peer) }) } : {},
          market: {
            asset: `${policy.coin}USDT`,
            round_id: String(market.roundId),
            timeframe: String(market.timeframe || "5m"),
            round_duration_seconds: Number(market.roundDurationSeconds || 300),
            seconds_to_close: Number(market.secondsToClose),
            up_odds: Number(market.upOdds),
            down_odds: Number(market.downOdds),
            data_timestamp: Number(market.dataTimestamp),
            ...market.roundContext ? { round_context: structuredClone(market.roundContext) } : {}
          },
          indicators: selectedIndicators({ ...indicators, marketOdds: { up: market.upOdds, down: market.downOdds } }, policy.indicators),
          ...divinationStrategies.includes(policy.strategy) ? { divination: evaluateDivination(policy.strategy, { ...indicators, marketOdds: { up: market.upOdds, down: market.downOdds } }, { roundId: market.roundId, asset: `${policy.coin}USDT`, frozenReading: frozenDivination, actionUrge }).divination } : {},
          account: {
            balance: Number(account.balance),
            initial_balance: Number(account.initialBalance ?? 100),
            capital_recovery: capital.recoveryActive,
            wins: Number(account.wins),
            losses: Number(account.losses),
            win_streak: Number(account.winStreak),
            loss_streak: Number(account.lossStreak),
            open_stake: Number(account.openStake)
          },
          policy: {
            agent_id: policy.id,
            ...policy.aiConnectionId !== void 0 ? { ai_connection_id: policy.aiConnectionId, ai_connection_revision: policy.aiConnectionRevision } : {},
            strategy: policy.strategy,
            decision_variance: policy.decisionVariance,
            action_urge: actionUrge,
            personal_action_urge: personalActionUrge,
            battle_action_urge: Math.max(0, Math.min(100, Math.round(Number(battleActionUrge) || 0))),
            emotion_sensitivity: policy.emotionSensitivity,
            emotion_state: emotion.state,
            emotion_streak: emotion.streak,
            battle_emotion: emotion.battleEmotion,
            risk_appetite: emotion.battleEmotion >= 70 ? "HIGH" : "STANDARD",
            personality_stake_multiplier: Number(emotion.personalityStakeMultiplier.toFixed(4)),
            shared_tilt_multiplier: Number(emotion.globalStakeMultiplier.toFixed(4)),
            emotion_stake_multiplier: Number(emotion.stakeMultiplier.toFixed(4)),
            effective_minimum_confidence: Number(emotion.minimumConfidence.toFixed(2)),
            max_stake_pct: capital.recoveryActive ? 100 : policy.maxStakePct,
            capital_management: capital,
            min_stake_usdt: capital.recoveryActive ? 0.01 : MIN_STAKE,
            countertrade_stake_multiplier: policy.strategy === "contrarian" ? countertrade.stakeMultiplier : 1,
            allow_all_in: capital.recoveryActive || policy.allowAllIn,
            minimum_confidence: policy.minConfidence,
            base_stake_pct: policy.baseStakePct,
            all_in_confidence: allInRequirements({ strategy: policy.strategy, battleEmotion }).confidence,
            all_in_requirements: allInRequirements({ strategy: policy.strategy, battleEmotion }),
            strategy_rule: PROFILE_RULES[policy.strategy].enDescription,
            required_indicators: PROFILE_RULES[policy.strategy].required.map((key) => indicatorCatalog[key].field)
          }
        };
      }
      function countertradeForInput(input) {
        return eligibleCountertradePeers(input.policy.strategy, input.policy.action_urge, { agentId: input.policy.agent_id, roundId: input.market.round_id, asset: input.market.asset, peers: input.peers });
      }
      function capitalForInput(input) {
        return capitalManagement({
          strategy: input.policy.strategy,
          balance: input.account.balance,
          initialBalance: input.account.initial_balance,
          openStake: input.account.open_stake || 0,
          recoveryActive: input.account.capital_recovery
        });
      }
      function countertradeMultiplier(input) {
        return input.policy.strategy === "contrarian" ? countertradeForInput(input).stakeMultiplier : 1;
      }
      function decisionStakeChoices(input) {
        const profile = PROFILE_RULES[input.policy.strategy], emotion = emotionForInput(input);
        const amountFor = (pct) => {
          const amount = Math.floor(input.account.balance * pct + 1e-8) / 100;
          return { stake_usdt: amount, stake_pct: Number((amount / input.account.balance * 100).toFixed(6)) };
        };
        if (capitalForInput(input).recoveryActive) return { normal: [], probe: null, all_in: input.account.balance >= 0.01 ? {
          ...amountFor(100),
          risk_mode: "ALL_IN",
          requires: { strategyPermission: true, minimumConfidence: emotion.minimumConfidence, positiveEdge: true }
        } : null };
        const normal = [0, ...profile.tierConfidence].map((minimum, index) => {
          const maximum = profile.tierConfidence[index] === void 0 ? 100 : profile.tierConfidence[index] - 1e-6;
          const pct = normalStakePercent({ countertradeMultiplier: countertradeMultiplier(input), balance: input.account.balance, initialBalance: input.account.initial_balance, openStake: input.account.open_stake || 0, recoveryActive: input.account.capital_recovery, strategy: input.policy.strategy, baseStakePct: input.policy.base_stake_pct, maxStakePct: input.policy.max_stake_pct, confidence: minimum, winStreak: input.account.win_streak, lossStreak: input.account.loss_streak, emotionSensitivity: input.policy.emotion_sensitivity, battleEmotion: input.policy.battle_emotion });
          return { minimum_confidence: Math.max(minimum, emotion.minimumConfidence), maximum_confidence: maximum, ...amountFor(pct), risk_mode: countertradeMultiplier(input) > 1 ? "ADD_ON" : "NORMAL" };
        }).filter((row) => row.stake_usdt >= MIN_STAKE && row.minimum_confidence <= row.maximum_confidence);
        const permission = ["UP", "DOWN"].map((direction) => betPermission(input, direction)).find((p) => p.probe);
        const probe = permission ? { ...amountFor(permission.maxProbePct), risk_mode: "NORMAL" } : null;
        return { normal, probe: probe?.stake_usdt >= MIN_STAKE ? probe : null, ...input.account.balance >= MIN_STAKE && input.policy.allow_all_in && input.policy.max_stake_pct === 100 ? { all_in: { ...amountFor(100), risk_mode: "ALL_IN", requires: { ...allInRequirements({ strategy: input.policy.strategy, battleEmotion: input.policy.battle_emotion }), strongConsensus: true } } } : {} };
      }
      function decisionFacts(input) {
        const permissions = Object.fromEntries(["UP", "DOWN"].map((direction) => [direction, betPermission(input, direction)]));
        const odds = { UP: input.market.up_odds, DOWN: input.market.down_odds };
        const facts = { permissions, break_even_confidence_pct: Object.fromEntries(Object.entries(odds).map(([side, value]) => [side, 100 / value])), minimum_confidence: emotionForInput(input).minimumConfidence };
        facts.all_in = { ...allInRequirements({ strategy: input.policy.strategy, battleEmotion: input.policy.battle_emotion }), enabled: input.policy.allow_all_in && input.policy.max_stake_pct === 100, strong_consensus: Object.fromEntries(["UP", "DOWN"].map((side) => [side, strongCoreConsensus(coreSnapshot(input), side, input.policy.strategy)])) };
        if (capitalForInput(input).recoveryActive) facts.all_in = { enabled: true, recovery: true, strategy_permission_required: true, minimum_confidence: facts.minimum_confidence, positive_edge_required: true };
        if (["contrarian", "showoff"].includes(input.policy.strategy)) {
          const peers = countertradeForInput(input);
          facts.countertrade = {
            required_loss_streak: peers.requiredLosses,
            eligible_count: peers.targets.length,
            mode: peers.mode,
            eligible_targets: peers.targets.map((a) => ({ id: a.id, name: a.name, loss_streak: a.lossStreak, direction: a.order.direction, stake: a.order.amount, performance: a.performance, loss_assessment: a.lossAssessment, vote_weight: a.voteWeight })),
            up_stake: peers.upStake,
            down_stake: peers.downStake,
            weighted_up: peers.up,
            weighted_down: peers.down,
            losing_count: peers.losingCount,
            loss_breadth: peers.lossBreadth,
            direction_agreement: peers.agreement,
            losing_direction_agreement: peers.losingAgreement,
            stake_multiplier: peers.stakeMultiplier,
            fade_direction: Math.abs(peers.up - peers.down) < 1e-8 ? null : peers.up > peers.down ? "DOWN" : "UP"
          };
        }
        return facts;
      }
      function decisionPrompt(input = {}) {
        const prompt = buildDecisionPrompt({
          asset: input.market?.asset,
          timeframe: input.market?.timeframe,
          strategy: input.policy?.strategy,
          decision_variance: input.policy?.decision_variance,
          action_urge: input.policy?.action_urge,
          personal_action_urge: input.policy?.personal_action_urge,
          battle_action_urge: input.policy?.battle_action_urge,
          emotion_sensitivity: input.policy?.emotion_sensitivity,
          emotion_state: input.policy?.emotion_state,
          emotion_streak: input.policy?.emotion_streak,
          battle_emotion: input.policy?.battle_emotion,
          emotion_stake_multiplier: input.policy?.emotion_stake_multiplier,
          effective_minimum_confidence: input.policy?.effective_minimum_confidence,
          max_stake_pct: input.policy?.max_stake_pct,
          allow_all_in: input.policy?.allow_all_in,
          capital_recovery: capitalForInput(input).recoveryActive,
          indicatorFields: Object.keys(input.indicators || {})
        });
        const target = "\nPredict settlement relative to the ORIGINAL round opening price, not merely the next price move. market.round_context, when present, contains opening/current price, distance and closed-candle noise; spot-proxy prices are NOT the official oracle. A small rebound can still settle DOWN, and a pullback can still settle UP. Never invent an unavailable opening price. The shared local direction check aligns technical strategy signals to this target; fixed-side characters and frozen oracle contracts remain unchanged.";
        const signal = input.market?.round_context ? strategySignal(input) : null;
        const correction = signal?.directionCorrection ? `
Local settlement-target correction: ${JSON.stringify(signal.directionCorrection)}. Any BET must use the corrected direction; keep the same stake ladder, confidence requirements and positive-edge gate. Do not increase confidence merely to make the corrected side affordable.` : "";
        const advice = input.policy?.review_mode === "model" ? `
This is an independent model review, not proof of an entry signal. Read the market and choose BET or SKIP. Local execution permissions for this exact input: ${JSON.stringify(Object.fromEntries(["UP", "DOWN"].map((direction) => [direction, betPermission(input, direction)])))}. A probe uses the supplied maxProbePct, which follows this personality\u2019s tilt curve rather than a shared fixed percentage; the minimum is ${MIN_STAKE} USDT, including probes. Use only the supplied maxProbePct, while obeying configured and personality hard caps. If no legal amount reaches the minimum, SKIP. Never use ADD_ON or ALL_IN for a probe. Explain why you choose to act or wait. Do not increase confidence merely to pass the edge gate.` : "";
        const capitalNote = `
Capital sizing: ${JSON.stringify(capitalForInput(input))}. RECOVERY_ALL_IN is the shared exception to normal, probe and personality amount caps: any permitted BET must use the all_in choice until recovery ends. It does not override direction, freshness, minimum confidence, positive edge. Recovery-only paper bets may use the full sub-5 USDT balance down to 0.01 USDT; ordinary bets retain the 5 USDT minimum. PROFIT_PROTECTION reduces the usual percentage for cautious strategies; the exact stake choices already include that reduction.`;
        const amounts = `
Exact stake choices for the current balance ${input.account.balance} USDT: ${JSON.stringify(decisionStakeChoices(input))}. After choosing an honest confidence, copy BOTH stake_usdt and stake_pct from the eligible normal confidence band, the probe row when execution permissions require a probe, or the all_in row when ALL_IN is enabled and every supplied ALL_IN condition is met. If no eligible amount exists, SKIP. Never assume 10 USDT means 10 percent. Money has at most two decimal places; percentages must describe the actual rounded amount. ALL_IN still needs every stated condition.`;
        const facts = `
Program-verified decision facts: ${JSON.stringify(decisionFacts(input))}. These facts are authoritative. A permitted side is an option, never an obligation. Confidence must be strictly ABOVE that side's break_even_confidence_pct as well as at least minimum_confidence. For example, confidence 62 and odds 1.0417 means negative edge, not a thin positive edge. Do not raise confidence to qualify.
For BET return skip_reason_code=null. For SKIP return exactly one of: STRATEGY_BLOCKED only if BOTH directions are forbidden; NO_ELIGIBLE_PEERS only for countertraders with eligible_count=0; ORACLE_WAIT only if input.divination.verdict=WAIT; otherwise MODEL_UNCERTAIN for your discretionary judgement (including insufficient confidence or edge). Never call an eligible target ineligible. Free-text reason is model commentary; the program checks the reason code against these facts.`;
        const extra = target + correction + advice + facts + amounts + capitalNote + (input.market?.entry_mode === "signal" ? "\nThis is a mid-round review. Use seconds_to_close for the original round; a new full round does not start now." : "");
        return prompt.replace("Return exactly one JSON object", `${extra}
Return exactly one JSON object`);
      }
      function skip(roundId, reason, engine = "mock") {
        return {
          round_id: String(roundId),
          action: "SKIP",
          direction: null,
          stake_usdt: 0,
          stake_pct: 0,
          confidence: 0,
          risk_mode: "WAIT",
          skip_reason_code: "MODEL_UNCERTAIN",
          factors: [],
          reason,
          data_fresh: true,
          warnings: [],
          engine
        };
      }
      function signalScore(input) {
        const i = input.indicators;
        const factors = [];
        let score = 0;
        const add = (name, value, weight) => {
          score += weight;
          factors.push({ name, value: String(value), impact: weight > 0 ? "UP" : weight < 0 ? "DOWN" : "NEUTRAL" });
        };
        if (i.price_change_pct) {
          add("price_1m", i.price_change_pct.oneMinute.toFixed(4), Math.sign(i.price_change_pct.oneMinute) * 1.2);
          add("price_5m", i.price_change_pct.fiveMinutes.toFixed(4), Math.sign(i.price_change_pct.fiveMinutes) * 1.8);
        }
        if (Number.isFinite(i.rsi_14)) add("rsi_14", i.rsi_14.toFixed(2), i.rsi_14 > 54 ? 1 : i.rsi_14 < 46 ? -1 : 0);
        if (i.ema_5_20) add("ema_5_20", `${i.ema_5_20.ema5.toFixed(2)}/${i.ema_5_20.ema20.toFixed(2)}`, Math.sign(i.ema_5_20.ema5 - i.ema_5_20.ema20) * 1.6);
        if (Number.isFinite(i.spot_order_book_imbalance)) add("spot_book", i.spot_order_book_imbalance.toFixed(4), Math.abs(i.spot_order_book_imbalance) < 0.03 ? 0 : Math.sign(i.spot_order_book_imbalance) * 1.4);
        if (Number.isFinite(i.volume_ratio)) {
          const multiplier = Math.max(0.75, Math.min(1.35, i.volume_ratio));
          score *= multiplier;
          factors.push({ name: "volume_ratio", value: i.volume_ratio.toFixed(3), impact: "NEUTRAL" });
        }
        return { score, factors };
      }
      function coreSnapshot(input) {
        const i = input.indicators;
        return {
          priceChangePct: i.price_change_pct,
          rsi14: i.rsi_14,
          ema: i.ema_5_20,
          volumeRatio: i.volume_ratio,
          spotOrderBookImbalance: i.spot_order_book_imbalance,
          macd: i.macd_12_26_9,
          bollinger: i.bollinger_20,
          atr: i.atr_14,
          adx: i.adx_dmi_14,
          roc: i.roc_10_20,
          momentum: i.momentum_10,
          volatility: i.realized_volatility_20,
          takerFlow: i.taker_flow_5,
          spread: i.spread_microprice,
          longReturns: i.returns_15_60,
          marketOdds: i.market_odds
        };
      }
      function emotionForInput(input) {
        return emotionAdjustment({ strategy: input.policy.strategy, actionUrge: input.policy.action_urge, emotionSensitivity: input.policy.emotion_sensitivity, battleEmotion: input.policy.battle_emotion, winStreak: input.account.win_streak, lossStreak: input.account.loss_streak });
      }
      function emotionFactor(emotion) {
        return { name: "emotion", value: `${emotion.state}:${emotion.streak}; own=${emotion.sensitivity}; arena=${emotion.battleEmotion}; stake=x${emotion.stakeMultiplier.toFixed(3)}; min_confidence=${emotion.minimumConfidence.toFixed(2)}`, impact: "NEUTRAL" };
      }
      function emotionSuffix(emotion) {
        if (emotion.state === "neutral" || emotion.sensitivity === 0) return "";
        if (emotion.state === "win") return emotion.stakeMultiplier > 1.001 ? "\uFF1B\u8FDE\u80DC\u60C5\u7EEA\u52A0\u7801" : "\uFF1B\u8FDE\u80DC\u540E\u4ECD\u4FDD\u6301\u51B7\u9759";
        return emotion.stakeMultiplier > 1.001 ? "\uFF1B\u8FDE\u8D25\u540E\u66F4\u60F3\u7FFB\u672C" : "\uFF1B\u8FDE\u8D25\u60C5\u7EEA\u7F29\u6CE8";
      }
      function createMockDecisionProvider() {
        return {
          describe: () => ({ mode: "mock", provider: "Local deterministic model", model: "offline-v2", configured: true, simulated: true }),
          async decide(input) {
            assertDecisionInputs(input);
            const signal = strategySignal(input) || signalScore(input);
            const oracle = signal.divination;
            const oracleResult = (verdict) => oracle ? { divination: { seed: oracle.seed, reading: formatDivination(oracle), verdict }, warnings: ["ENTERTAINMENT_ONLY"] } : {};
            const { score } = signal, emotion = emotionForInput(input), factors = [...signal.factors, emotionFactor(emotion)];
            const direction = score >= 0 ? "UP" : "DOWN";
            const odds = direction === "UP" ? input.market.up_odds : input.market.down_odds;
            const baseConfidence = confidenceForScore(score, input.policy.decision_variance, input.policy.strategy);
            const nudge = personalityNudge({ strategy: input.policy.strategy, agentId: input.policy.agent_id, roundId: input.market.round_id, variance: input.policy.decision_variance, confidence: baseConfidence, minimumConfidence: emotion.minimumConfidence });
            const confidence = Math.max(50, Math.min(97, baseConfidence + nudge));
            factors.push({ name: "personality_nudge", value: nudge.toFixed(3), impact: "NEUTRAL" });
            const edge = confidence / 100 * odds - 1;
            if (Math.abs(score) < entryThreshold(input) || confidence < emotion.minimumConfidence || edge <= 0) {
              return { ...skip(input.market.round_id, oracle ? `${formatDivination(oracle)}\uFF1B\u672C\u5730\u6A21\u62DF\uFF0C\u672C\u8F6E\u89C2\u671B` : "\u6CA1\u6709\u901A\u8FC7\u672C\u5730\u9A8C\u8BC1\u7684\u6B63\u671F\u671B"), confidence: Math.round(confidence), factors, ...oracleResult("WAIT") };
            }
            let stakePct = normalStakePercent({ countertradeMultiplier: countertradeMultiplier(input), balance: input.account.balance, initialBalance: input.account.initial_balance, openStake: input.account.open_stake || 0, recoveryActive: input.account.capital_recovery, strategy: input.policy.strategy, baseStakePct: input.policy.base_stake_pct, maxStakePct: input.policy.max_stake_pct, confidence, edge, winStreak: input.account.win_streak, lossStreak: input.account.loss_streak, emotionSensitivity: input.policy.emotion_sensitivity, battleEmotion: input.policy.battle_emotion });
            let riskMode = input.policy.strategy !== "liangXi" && (countertradeMultiplier(input) > 1 || emotion.streak && emotion.stakeMultiplier > 1.001) ? "ADD_ON" : "NORMAL";
            const permission = betPermission(input, direction);
            const allInRules = allInRequirements({ strategy: input.policy.strategy, battleEmotion: input.policy.battle_emotion });
            const allIn = !permission.probe && input.policy.allow_all_in && input.policy.max_stake_pct === 100 && confidence >= allInRules.confidence && edge >= allInRules.minimumEdge && strongCoreConsensus(coreSnapshot(input), direction, input.policy.strategy) && input.account.loss_streak >= allInRules.requiredLossStreak;
            if (allIn || capitalForInput(input).recoveryActive) {
              stakePct = 100;
              riskMode = "ALL_IN";
            }
            if (permission.probe) {
              stakePct = Math.min(Math.max(stakePct, MIN_STAKE * 100 / input.account.balance), permission.maxProbePct);
              riskMode = "NORMAL";
            }
            stakePct = Math.min(stakePct, capitalForInput(input).recoveryActive ? 100 : input.policy.max_stake_pct);
            const stake = Math.floor(input.account.balance * stakePct + 1e-8) / 100;
            if (stake < (capitalForInput(input).recoveryActive ? 0.01 : MIN_STAKE)) return { ...skip(input.market.round_id, "\u91D1\u989D\u4F4E\u4E8E\u672C\u5730\u6700\u5C0F\u503C"), ...oracleResult("WAIT") };
            return {
              round_id: input.market.round_id,
              action: "BET",
              direction,
              stake_usdt: stake,
              stake_pct: stake / input.account.balance * 100,
              confidence: Math.round(confidence),
              risk_mode: riskMode,
              factors,
              reason: (signal.directionCorrection ? "\u7ED3\u5408\u672C\u8F6E\u5F00\u76D8\u4F4D\u7F6E\u4E0E\u5269\u4F59\u65F6\u95F4\uFF0C\u4FEE\u6B63\u7ED3\u7B97\u65B9\u5411" : oracle ? `${formatDivination(oracle)}\uFF1B\u5366\u724C\u4E0E\u6307\u6807\u540C\u5411\uFF0C\u5C0F\u6CE8\u8BD5\u52BF` : input.policy.strategy === "smart" ? `\u5148\u5224\u65AD${signal.regime === "trend" ? "\u8D8B\u52BF\u5C40" : "\u9707\u8361\u5C40"}\uFF0C\u518D\u6309\u4F18\u52BF\u8C03\u6574\u91D1\u989D` : input.policy.strategy === "conservative" ? "\u6CE2\u52A8\u548C\u4EF7\u5DEE\u5B89\u5168\uFF0C\u8D8B\u52BF\u4E0E\u76D8\u53E3\u5168\u90E8\u540C\u5411\uFF0C\u53EA\u62BC\u5C0F\u6CE8" : input.policy.strategy === "aggressive" ? "\u77ED\u7EBF\u3001\u52A8\u91CF\u548C\u4E3B\u52A8\u4E70\u5356\u540C\u5411" : input.policy.strategy === "priceAction" ? "\u541E\u6CA1\u3001\u5F71\u7EBF\u3001\u8FDE\u9633\u8FDE\u9634\u6216\u524D\u9AD8\u524D\u4F4E\u7A81\u7834\u5F62\u6210\u540C\u5411\u88F8K\u4FE1\u53F7" : input.policy.strategy === "contrarian" ? countertradeMultiplier(input) > 1 ? "\u591A\u4EBA\u4E8F\u635F\u4E14\u65B9\u5411\u4E00\u81F4\uFF0C\u53CD\u5411\u52A0\u7801" : "\u7EFC\u5408\u5BF9\u624B\u5386\u53F2\u4E8F\u635F\u4E0E\u672C\u8F6E\u65B9\u5411\uFF0C\u53CD\u5411\u4E0B\u6CE8" : `\u6307\u6807\u7B26\u5408${PROFILE_RULES[input.policy.strategy].label}\u89C4\u5219`) + (signal.directionCorrection ? "" : emotionSuffix(emotion)),
              data_fresh: true,
              warnings: [],
              ...oracleResult(direction)
            };
          }
        };
      }
      function strategySignal(input) {
        return alignRoundDirection(rawStrategySignal(input), input);
      }
      function rawStrategySignal(input) {
        const profile = PROFILE_RULES[input.policy.strategy];
        const character = evaluateCharacter(input.policy.strategy, coreSnapshot(input), input.policy.action_urge, { asset: input.market.asset, roundId: input.market.round_id, agentId: input.policy.agent_id, peers: input.peers });
        if (character) return character;
        const oracle = evaluateDivination(input.policy.strategy, coreSnapshot(input), { roundId: input.market.round_id, asset: input.market.asset, frozenReading: input.divination, actionUrge: input.policy.action_urge });
        if (oracle) return oracle;
        const priceAction = evaluatePriceAction(input.policy.strategy, input.indicators.raw_candles, input.policy.action_urge);
        if (priceAction) return priceAction;
        const core = evaluateCoreStrategy(input.policy.strategy, coreSnapshot(input), input.policy.action_urge);
        if (core) return core;
        if (!profile?.required.length) return null;
        const i = input.indicators, factors = [];
        if (profile.required.some((key) => !completeIndicator(i[indicatorCatalog[key].field]))) return { score: 0, factors };
        const urge = Math.max(0, Math.min(100, Number(input.policy.action_urge ?? profile.actionUrge))) / 100;
        const long = longHorizonContext({ longReturns: i.returns_15_60 });
        const direction = (value, deadband = 0) => Number.isFinite(Number(value)) && Math.abs(Number(value)) > deadband ? Math.sign(Number(value)) : 0;
        const tally = (votes) => ({ up: votes.filter((v) => v > 0).length, down: votes.filter((v) => v < 0).length });
        const unopposedMajority = (votes, minimum) => {
          const { up, down } = tally(votes);
          return down === 0 && up >= minimum ? 1 : up === 0 && down >= minimum ? -1 : 0;
        };
        let vote = 0, score = 0, regime = "waiting";
        switch (input.policy.strategy) {
          case "trendFollowing": {
            const votes = [direction(i.price_change_pct.fiveMinutes, 0.02), direction(i.ema_5_20.ema5 - i.ema_5_20.ema20), direction(i.macd_12_26_9.histogram), direction(i.adx_dmi_14.plusDI - i.adx_dmi_14.minusDI), long.fifteen, long.sixty];
            const { up, down } = tally(votes), minimum = urge >= 0.5 ? 4 : 5;
            if (i.adx_dmi_14.adx >= 24 - urge * 8) vote = up >= minimum && down <= 1 ? 1 : down >= minimum && up <= 1 ? -1 : 0;
            score = vote * (Math.max(up, down) === 6 ? 6 : Math.max(up, down) === 5 ? 5.2 : 4.6);
            regime = vote ? "trend" : "conflict";
            break;
          }
          case "meanReversion": {
            if (i.adx_dmi_14.adx < 32 + urge * 14) {
              const edge = 0.14 + urge * 0.2, rsiLow = 40 + urge * 6, rsiHigh = 60 - urge * 6, stochLow = 28 + urge * 16, stochHigh = 72 - urge * 16, minimum = urge >= 0.2 ? 2 : 3;
              const votes = [i.bollinger_20.percentB <= edge ? 1 : i.bollinger_20.percentB >= 1 - edge ? -1 : 0, i.rsi_14 <= rsiLow ? 1 : i.rsi_14 >= rsiHigh ? -1 : 0, i.stochastic_14_3.k <= stochLow ? 1 : i.stochastic_14_3.k >= stochHigh ? -1 : 0];
              const { up, down } = tally(votes);
              vote = up >= minimum && down === 0 ? 1 : down >= minimum && up === 0 ? -1 : 0;
              if (vote && long.opposition(vote) >= 2 && i.adx_dmi_14.adx >= 35) vote = 0;
              score = vote * (Math.max(up, down) === 3 ? 6 : 4.6);
            }
            regime = vote ? "reversion" : "waiting";
            break;
          }
          case "breakout": {
            const exact = direction(i.donchian_20.breakout), close = Number(i.donchian_20.close), upper = Number(i.donchian_20.upper), lower = Number(i.donchian_20.lower), buffer = 1e-4 + urge * 19e-4;
            const near = exact || (![close, upper, lower].every(Number.isFinite) ? 0 : close >= upper * (1 - buffer) ? 1 : close <= lower * (1 + buffer) ? -1 : 0);
            const confirms = [direction(i.price_change_pct.oneMinute, 0.01), direction(i.taker_flow_5.buyRatio - 0.5, 0.03)], same = confirms.filter((value) => value === near).length;
            const longReady = exact ? long.opposition(near) < 2 : long.opposition(near) < 2 && long.support(near) >= 1;
            if (i.volume_ratio >= 1.35 - urge * 0.35 && i.atr_14.percent <= 0.75 + urge * 0.45 && near && same >= 1 && longReady) vote = near;
            score = vote * (exact ? same === 2 ? 6 : 5 : same === 2 ? 4.8 : 4.3);
            regime = vote ? exact ? "breakout" : "near-break" : "waiting";
            break;
          }
          case "orderFlow": {
            const votes = [direction(i.taker_flow_5.buyRatio - 0.5, 0.1 - urge * 0.07), direction(i.spot_order_book_imbalance, 0.12 - urge * 0.09), direction(i.price_change_pct.oneMinute, 0.015 - urge * 0.01)];
            if (i.spread_microprice.basisPoints <= 4 + urge * 3) vote = unopposedMajority(votes, 2);
            if (vote && long.opposition(vote) >= 2) vote = 0;
            const { up, down } = tally(votes);
            score = vote * (Math.max(up, down) === 3 ? 6 : 4.8);
            regime = vote ? "flow" : "conflict";
            break;
          }
          case "volatilityGuard": {
            const votes = [direction(i.ema_5_20.ema5 - i.ema_5_20.ema20), direction(i.price_change_pct.fiveMinutes, 0.02), direction(i.spot_order_book_imbalance, 0.03)];
            if (i.atr_14.percent <= 0.3 + urge * 0.25 && i.realized_volatility_20.perMinutePct <= 0.16 + urge * 0.16) vote = unopposedMajority(votes, 2);
            if (vote && (long.support(vote) < 1 || long.opposition(vote) > 0)) vote = 0;
            const { up, down } = tally(votes);
            score = vote * (Math.max(up, down) === 3 ? 6 : 5.3);
            regime = vote ? "calm" : "unsafe-or-conflict";
            break;
          }
          case "consensus": {
            const votes = [direction(i.price_change_pct.fiveMinutes), direction(i.ema_5_20.ema5 - i.ema_5_20.ema20), direction(i.macd_12_26_9.histogram), direction(i.rsi_14 - 50, 4), direction(i.spot_order_book_imbalance, 0.03), direction(i.taker_flow_5.buyRatio - 0.5, 0.05)];
            const { up, down } = tally(votes), minimum = urge >= 0.5 ? 4 : 5;
            vote = up >= minimum && down <= 1 ? 1 : down >= minimum && up <= 1 ? -1 : 0;
            if (vote && long.opposition(vote) >= 2) vote = 0;
            score = vote * (Math.max(up, down) === 6 ? 6 : Math.max(up, down) === 5 ? 5.8 : 5.4);
            regime = vote ? "consensus" : "split";
            break;
          }
        }
        for (const key of profile.required.filter((key2) => key2 !== "odds")) {
          if (key === "longReturns") {
            factors.push(
              { name: "return_15m", value: Number(i.returns_15_60.fifteenMinutes).toFixed(4), impact: long.fifteen > 0 ? "UP" : long.fifteen < 0 ? "DOWN" : "NEUTRAL" },
              { name: "return_60m", value: Number(i.returns_15_60.sixtyMinutes).toFixed(4), impact: long.sixty > 0 ? "UP" : long.sixty < 0 ? "DOWN" : "NEUTRAL" }
            );
            continue;
          }
          const field = indicatorCatalog[key].field;
          factors.push({ name: field, value: JSON.stringify(i[field]).slice(0, 80), impact: vote > 0 ? "UP" : vote < 0 ? "DOWN" : "NEUTRAL" });
        }
        return { score, factors, regime };
      }
      function createOffDecisionProvider(reason = "AI_DECISION_DISABLED") {
        return {
          describe: () => ({ mode: "off", provider: null, model: null, configured: false, simulated: false }),
          decide: async (input) => skip(input.market.round_id, reason, "off")
        };
      }
      function entryThreshold(input) {
        return 2.4 - Math.max(0, Math.min(100, Number(input.policy.action_urge) || 0)) * 0.014;
      }
      function betPermission(input, direction) {
        const signal = strategySignal(input), sign = direction === "UP" ? 1 : -1;
        const matched = signal?.score && Math.sign(signal.score) === sign;
        const i = input.indicators;
        const unsafe = i.spread_microprice?.basisPoints > 8 || i.atr_14?.percent > 1.2 || i.realized_volatility_20?.perMinutePct > 0.8;
        const flexible = input.policy.review_mode === "model" && ["aggressive", "smart", "priceAction"].includes(input.policy.strategy);
        const weak = !matched || Math.abs(signal.score) < entryThreshold(input);
        const strongConflict = !matched && Math.abs(signal?.score || 0) >= 5;
        const patterns = signal?.factors?.filter((f) => ["engulfing", "rejection_wick", "range_break", "three_bar_structure", "candle_run", "body_drive"].includes(f.name)) || [];
        const patternConflict = patterns.some((f) => f.impact === "UP") && patterns.some((f) => f.impact === "DOWN");
        const allowed = !unsafe && (matched && !weak || flexible && input.policy.action_urge >= 70 && !strongConflict && !patternConflict && !signal?.directionCorrection && !["missing", "risk-off"].includes(signal?.regime));
        const probe = !capitalForInput(input).recoveryActive && Boolean(allowed && (weak || signal?.probe || Math.abs(signal?.score || 0) < 3));
        return { allowed: Boolean(allowed), probe, maxProbePct: probeStakePercent({ strategy: input.policy.strategy, baseStakePct: input.policy.base_stake_pct, maxStakePct: input.policy.max_stake_pct, balance: input.account.balance, initialBalance: input.account.initial_balance, openStake: input.account.open_stake || 0, recoveryActive: input.account.capital_recovery, battleEmotion: input.policy.battle_emotion }) };
      }
      function entryWaitReason(input) {
        const signal = strategySignal(input);
        const reason = signal?.factors?.find((f) => f.name === "character_gate")?.value;
        return reason === "CZ_NOT_BETTING" ? "WAIT_CZ_BET" : reason === "WAIT_FOR_BULL_TREND" ? "WAIT_BULL_TREND" : ["NO_LOSING_PEERS", "NO_CURRENT_PEERS", "PEERS_TIED"].includes(reason) ? "WAIT_PEER_BET" : signal?.regime === "oracle-wait" ? "WAIT_ORACLE_SIGNAL" : "WAIT_ENTRY_SIGNAL";
      }
      function modelReview(input, candleCloseTime, previous, now) {
        assertDecisionInputs(input);
        if (input.policy.strategy === "showoff" && !entrySignal(input, candleCloseTime)) return { reason: "WAIT_CZ_BET" };
        const cooldown = 12e4 - Math.max(0, Math.min(100, input.policy.action_urge)) * 600;
        const limit = Math.min(12, 1 + Math.ceil(input.market.round_duration_seconds * 1e3 / cooldown));
        if ((previous?.count ?? previous?.keys?.length ?? 0) >= limit) return { reason: "AI_REVIEW_LIMIT" };
        const retryDelay = previous?.count === 0 ? 3e4 : cooldown;
        if (previous && now - previous.at < retryDelay) return { reason: "AI_REVIEW_COOLDOWN" };
        const signal = strategySignal(input);
        const peers = (input.peers?.agents || []).filter((a) => a.order).map((a) => [a.id, a.order.id, a.lossStreak, ...input.policy.strategy === "contrarian" ? [a.performance] : []]);
        const key = JSON.stringify(["model", candleCloseTime ?? null, Math.round(1 / input.market.up_odds * 20), Math.round(1 / input.market.down_odds * 20), Math.sign(signal?.score || 0), peers, input.policy.action_urge, input.policy.battle_emotion ?? 0, input.policy.controls_revision ?? 0]);
        if (previous?.keys?.includes(key)) return { reason: "AI_WAIT_MARKET_CHANGE" };
        return { key };
      }
      function entrySignal(input, candleCloseTime) {
        assertDecisionInputs(input);
        const signal = strategySignal(input) || signalScore(input);
        if (!Number.isFinite(signal.score) || Math.abs(signal.score) < entryThreshold(input)) return null;
        const direction = signal.score > 0 ? "UP" : "DOWN";
        const peers = ["contrarian", "showoff"].includes(input.policy.strategy) ? (input.peers?.agents || []).filter((a) => a.order).map((a) => a.order.id).sort() : [];
        return { direction, key: JSON.stringify([
          direction,
          signal.regime,
          Math.floor(Math.abs(signal.score)),
          candleCloseTime ?? null,
          peers
        ]), score: signal.score };
      }
      function createDeepSeekDecisionProvider({ apiKey, baseUrl = "https://api.deepseek.com", model = "deepseek-chat", fetchImpl = require_http().aiFetch } = {}) {
        const secret = String(apiKey || "").trim();
        const endpoint = `${String(baseUrl).replace(/\/+$/, "")}/chat/completions`;
        return {
          describe: () => ({ mode: "deepseek", provider: "DeepSeek", model, configured: Boolean(secret), simulated: false }),
          async decide(input, { deadlineMs = Infinity, now = Date.now, onRequest, isCancelled } = {}) {
            assertDecisionInputs(input);
            if (!secret) throw decisionError("AI_NOT_CONFIGURED", 503);
            const timeoutMs = Math.floor(Math.min(8e3, deadlineMs - now() - 250));
            if (timeoutMs <= 0) throw decisionError("AI_DEADLINE_EXPIRED");
            if (isCancelled?.()) throw decisionError("AI_CONFIGURATION_CHANGED");
            const body = {
              model,
              temperature: Math.min(0.65, 0.15 + input.policy.decision_variance / 200),
              max_tokens: 1500,
              response_format: { type: "json_object" },
              messages: [{ role: "system", content: decisionPrompt(input) }, { role: "user", content: JSON.stringify(input) }]
            };
            onRequest?.({ provider: "deepseek", body: structuredClone(body), responseContract: "strategy-v2" });
            let response;
            try {
              response = await fetchImpl(endpoint, {
                method: "POST",
                headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(timeoutMs)
              });
            } catch {
              throw decisionError("AI_REQUEST_FAILED", 503);
            }
            if (!response?.ok) throw decisionError("AI_REQUEST_REJECTED", 503);
            let payload;
            try {
              payload = await response.json();
            } catch {
              throw decisionError("AI_RESPONSE_INVALID");
            }
            if (isCancelled?.()) throw decisionError("AI_CONFIGURATION_CHANGED");
            if (payload.choices?.[0]?.finish_reason === "length") throw decisionError("AI_RESPONSE_TRUNCATED");
            const content = payload?.choices?.[0]?.message?.content;
            if (typeof content !== "string" || !content.trim().startsWith("{") || !content.trim().endsWith("}")) throw decisionError("AI_RESPONSE_INVALID");
            let raw;
            try {
              raw = JSON.parse(content);
            } catch {
              throw decisionError("AI_RESPONSE_INVALID");
            }
            if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw decisionError("AI_RESPONSE_INVALID");
            Object.defineProperty(raw, DECISION_META, { value: { engine: { mode: "deepseek", provider: "DeepSeek", model, configured: true, simulated: false }, responseContract: "strategy-v2" } });
            return raw;
          }
        };
      }
      function strongConsensus(indicators, direction, strategy) {
        return strongCoreConsensus(indicators, direction, strategy);
      }
      function textArray(value, maxItems = 8) {
        return Array.isArray(value) ? value.slice(0, maxItems).map((item) => String(item).slice(0, 120)) : [];
      }
      function safeFactors(value) {
        if (!Array.isArray(value)) return [];
        return value.slice(0, 12).map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item) || !["UP", "DOWN", "NEUTRAL"].includes(item.impact)) {
            throw decisionError("AI_FACTORS_INVALID");
          }
          return { name: String(item.name || "").slice(0, 50), value: String(item.value || "").slice(0, 80), impact: item.impact };
        });
      }
      function validateDecision(raw, { input, indicators, policy, now = Date.now() }) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw decisionError("AI_RESPONSE_INVALID");
        if (typeof raw.round_id !== "string" || raw.round_id !== input.market.round_id) throw decisionError("AI_ROUND_MISMATCH");
        if (["confidence", "stake_usdt", "stake_pct"].some((key) => typeof raw[key] !== "number" || !Number.isFinite(raw[key])) || typeof raw.reason !== "string" || !Array.isArray(raw.factors) || !Array.isArray(raw.warnings) || raw.warnings.some((item) => typeof item !== "string")) {
          throw decisionError("AI_RESPONSE_INVALID");
        }
        if (!["BET", "SKIP"].includes(raw.action)) throw decisionError("AI_ACTION_INVALID");
        if (!["NORMAL", "ADD_ON", "ALL_IN", "WAIT"].includes(raw.risk_mode)) throw decisionError("AI_RISK_MODE_INVALID");
        const confidence = Number(raw.confidence);
        if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) throw decisionError("AI_CONFIDENCE_INVALID");
        const timestamps = [input.market.data_timestamp, indicators.dataTimestamp];
        if (raw.data_fresh !== true || timestamps.some((timestamp) => !Number.isFinite(timestamp) || now - timestamp > 1e4 || timestamp > now + 2e3)) {
          throw decisionError("AI_DATA_STALE");
        }
        const base = {
          action: raw.action,
          confidence,
          riskMode: raw.risk_mode,
          reason: String(raw.reason || "").slice(0, 160),
          factors: safeFactors(raw.factors),
          warnings: textArray(raw.warnings),
          ...policy.strategy === "contrarian" ? { countertrade: decisionFacts(input).countertrade } : {}
        };
        if (divinationStrategies.includes(policy.strategy)) {
          const frozen = strategySignal(input)?.divination;
          if (!frozen || !raw.divination || raw.divination.seed !== frozen.seed || typeof raw.divination.reading !== "string" || !raw.divination.reading.trim() || raw.divination.reading.length > 160 || raw.divination.verdict !== (raw.action === "BET" ? raw.direction : "WAIT")) throw decisionError("AI_DIVINATION_INVALID");
          base.divination = { ...frozen, interpretation: raw.divination.reading, finalVerdict: raw.divination.verdict };
          base.warnings = [.../* @__PURE__ */ new Set([...base.warnings, "ENTERTAINMENT_ONLY"])];
        }
        if (raw.action === "SKIP") {
          if (raw.direction !== null || Number(raw.stake_usdt) !== 0 || Number(raw.stake_pct) !== 0 || raw.risk_mode !== "WAIT") throw decisionError("AI_SKIP_INVALID");
          const strict = raw[DECISION_META]?.responseContract === "strategy-v2";
          const code = raw.skip_reason_code;
          if (strict || code != null) {
            const facts = decisionFacts(input);
            const valid = {
              MODEL_UNCERTAIN: true,
              STRATEGY_BLOCKED: !facts.permissions.UP.allowed && !facts.permissions.DOWN.allowed,
              NO_ELIGIBLE_PEERS: facts.countertrade?.eligible_count === 0,
              ORACLE_WAIT: input.divination?.verdict === "WAIT"
            };
            if (!Object.hasOwn(valid, code) || !valid[code]) throw decisionError("AI_REASON_CONTRADICTS_INPUT");
            base.skipReasonCode = code;
            if (strict) {
              base.modelReason = base.reason;
              base.reason = { MODEL_UNCERTAIN: "\u6A21\u578B\u81EA\u4E3B\u89C2\u671B", STRATEGY_BLOCKED: "\u7B56\u7565\u6761\u4EF6\u672A\u6EE1\u8DB3", NO_ELIGIBLE_PEERS: "\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u5BF9\u624B", ORACLE_WAIT: "\u5366\u724C\u672C\u8F6E\u89C2\u671B" }[code];
              base.verifiedFacts = facts;
            }
          }
          return { ...base, direction: null, stake: 0, stakePct: 0, expectedEdge: null };
        }
        if (!["UP", "DOWN"].includes(raw.direction)) throw decisionError("AI_DIRECTION_INVALID");
        assertDecisionInputs(input);
        const required = PROFILE_RULES[policy.strategy].required;
        if (required.some((key) => !completeIndicator(input.indicators[indicatorCatalog[key].field]))) throw decisionError("AI_INDICATOR_MISSING");
        const entry = strategySignal(input);
        const permission = betPermission(input, raw.direction);
        if (!permission.allowed) throw decisionError("AI_STRATEGY_CONDITION_NOT_MET");
        const stake = Number(raw.stake_usdt);
        const stakePct = Number(raw.stake_pct);
        if (!Number.isFinite(stake) || stake <= 0 || Math.abs(Math.round(stake * 100) - stake * 100) > 1e-8 || !Number.isFinite(stakePct) || stakePct <= 0 || raw.risk_mode === "WAIT") {
          throw decisionError("AI_STAKE_INVALID");
        }
        const capital = capitalForInput(input);
        if (stake < (capital.recoveryActive ? 0.01 : MIN_STAKE)) throw decisionError("AI_STAKE_BELOW_MINIMUM");
        const cap = Math.floor(input.account.balance * (capital.recoveryActive ? 100 : policy.maxStakePct) + 1e-8) / 100;
        if (capital.recoveryActive && (raw.risk_mode !== "ALL_IN" || Math.abs(stake - Math.floor(input.account.balance * 100 + 1e-8) / 100) > 1e-8)) throw decisionError("AI_ALL_IN_REJECTED");
        if (stake > input.account.balance || stake > cap || Math.abs(stakePct - stake / input.account.balance * 100) > 0.02) throw decisionError("AI_STAKE_OVER_CAP");
        if (permission.probe && (stakePct > permission.maxProbePct + 0.02 || raw.risk_mode !== "NORMAL")) throw decisionError("AI_PROBE_STAKE_OVER_CAP");
        const normalCap = PROFILE_RULES[policy.strategy].normalMaxStakePct;
        if (policy.strategy === "liangXi") {
          const expected = Math.floor(input.account.balance * (raw.risk_mode === "ALL_IN" ? 100 : 50) + 1e-8) / 100;
          if (!["NORMAL", "ALL_IN"].includes(raw.risk_mode) || Math.abs(stake - expected) > 1e-8) throw decisionError("AI_LIANGXI_STAKE_INVALID");
        }
        if (raw.risk_mode !== "ALL_IN" && stakePct > normalCap + 0.02) throw decisionError("AI_STAKE_OVER_CAP");
        const emotion = emotionForInput(input);
        if (raw.risk_mode === "ADD_ON" && emotion.stakeMultiplier <= 1.001 && countertradeMultiplier(input) <= 1) throw decisionError("AI_RISK_MODE_INVALID");
        if (confidence < emotion.minimumConfidence) throw decisionError("AI_CONFIDENCE_TOO_LOW");
        const odds = raw.direction === "UP" ? input.market.up_odds : input.market.down_odds;
        const expectedEdge = confidence / 100 * odds - 1;
        if (!Number.isFinite(expectedEdge) || expectedEdge <= 0) throw decisionError("AI_EDGE_NOT_POSITIVE");
        const emotionalNormalCap = permission.probe ? permission.maxProbePct : normalStakePercent({ countertradeMultiplier: countertradeMultiplier(input), balance: input.account.balance, initialBalance: input.account.initial_balance, openStake: input.account.open_stake || 0, recoveryActive: input.account.capital_recovery, strategy: policy.strategy, baseStakePct: policy.baseStakePct, maxStakePct: policy.maxStakePct, confidence, edge: expectedEdge, winStreak: input.account.win_streak, lossStreak: input.account.loss_streak, emotionSensitivity: policy.emotionSensitivity, battleEmotion: input.policy.battle_emotion });
        if (raw.risk_mode !== "ALL_IN" && stakePct > emotionalNormalCap + 0.02) throw decisionError("AI_STAKE_OVER_CAP");
        const allInRules = allInRequirements({ strategy: policy.strategy, battleEmotion: input.policy.battle_emotion });
        const effectivelyAllIn = raw.risk_mode === "ALL_IN" || stake >= input.account.balance * 0.95;
        if (!capital.recoveryActive && effectivelyAllIn && (!policy.allowAllIn || confidence < allInRules.confidence || !strongConsensus(indicators, raw.direction, policy.strategy))) {
          throw decisionError("AI_ALL_IN_REJECTED");
        }
        if (!capital.recoveryActive && raw.risk_mode === "ALL_IN" && (policy.maxStakePct !== 100 || Math.abs(stake - Math.floor(input.account.balance * 100) / 100) > 1e-8 || expectedEdge < allInRules.minimumEdge || input.account.loss_streak < allInRules.requiredLossStreak)) throw decisionError("AI_ALL_IN_REJECTED");
        return {
          ...base,
          direction: raw.direction,
          stake,
          stakePct,
          expectedEdge,
          probe: permission.probe,
          ...capital.mode !== "NORMAL" ? { modelReason: base.modelReason || base.reason, reason: capital.recoveryActive ? "\u640F\u547D\u68AD\u54C8\uFF1A\u7EE7\u7EED\u5168\u62BC\uFF0C\u76F4\u5230\u56DE\u672C\u3002" : "\u672C\u91D1\u5DF2\u589E\u957F\uFF0C\u6309\u4FDD\u5B88\u89C4\u5219\u51CF\u5C11\u4E0B\u6CE8\u3002" } : {},
          ...entry?.directionCorrection ? { directionCorrection: entry.directionCorrection } : {}
        };
      }
      function decisionAudit({ provider, input, plan, indicators, raw }) {
        return {
          engine: raw?.[DECISION_META]?.engine || provider.describeFor?.(input) || provider.describe(),
          ...raw?.[DECISION_META]?.usage ? { usage: raw[DECISION_META].usage } : {},
          inputHash: crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex"),
          roundId: input.market.round_id,
          dataTimestamp: Math.min(input.market.data_timestamp, indicators.dataTimestamp),
          action: plan.action,
          direction: plan.direction,
          stake: plan.stake,
          stakePct: plan.stakePct,
          confidence: plan.confidence,
          riskMode: plan.riskMode,
          capitalManagement: capitalForInput(input),
          expectedEdge: plan.expectedEdge,
          edgeBasis: "uncalibrated-model-probability-before-fees",
          ...plan.countertrade ? { countertrade: plan.countertrade } : {},
          reason: plan.reason,
          ...plan.skipReasonCode ? { skipReasonCode: plan.skipReasonCode } : {},
          ...plan.modelReason ? { modelReason: plan.modelReason, modelReasonVerified: false, verifiedFacts: plan.verifiedFacts } : {},
          warnings: plan.warnings,
          indicators: input.indicators,
          directionVersion: "round-target-v1",
          ...input.market.round_context ? { roundContext: input.market.round_context } : {},
          ...plan.directionCorrection ? { directionCorrection: plan.directionCorrection } : {},
          ...plan.divination ? { divination: plan.divination } : {}
        };
      }
      function rejectedDecisionAudit({ provider, input, indicators, reason }) {
        return {
          engine: provider.describeFor?.(input) || provider.describe(),
          inputHash: crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex"),
          roundId: input.market.round_id,
          dataTimestamp: Math.min(input.market.data_timestamp, indicators.dataTimestamp),
          action: "REJECTED",
          direction: null,
          stake: 0,
          confidence: 0,
          riskMode: "WAIT",
          expectedEdge: null,
          reason: String(reason || "AI_DECISION_FAILED"),
          warnings: [],
          indicators: input.indicators
        };
      }
      module.exports = {
        decisionFacts,
        decisionStakeChoices,
        betPermission,
        entryWaitReason,
        modelReview,
        DECISION_META,
        DEFAULT_AGENT_POLICIES,
        entrySignal,
        INDICATORS,
        PROFILE_RULES,
        buildDecisionContext,
        createDeepSeekDecisionProvider,
        createMockDecisionProvider,
        createOffDecisionProvider,
        decisionAudit,
        decisionPrompt,
        normalizeAgentPolicies,
        normalizePolicy,
        rejectedDecisionAudit,
        validateDecision,
        strategySignal,
        assertDecisionInputs
      };
    }
  });

  // recovery-policy.js
  var require_recovery_policy = __commonJS({
    "recovery-policy.js"(exports, module) {
      var RETRY_DELAYS = [5e3, 15e3, 3e4, 6e4, 6e4];
      var SETTLEMENT_POLL_MS = 3e4;
      function recoveryKind(code = "") {
        if (/AUTH|LOGIN|SESSION|WALLET_NOT_CONNECTED|UNAUTHORIZED|FORBIDDEN/.test(code)) return "auth";
        if (/NETWORK|TIMEOUT|ECONN|ENOTFOUND|EAI_AGAIN|FETCH|ABORT/i.test(code)) return "network";
        if (["AWAITING_SETTLEMENT", "SETTLEMENT_PENDING", "MARKET_RESULT_PENDING"].includes(code)) return "settlement";
        return "market";
      }
      module.exports = { RETRY_DELAYS, SETTLEMENT_POLL_MS, recoveryKind };
    }
  });

  // public/market-values.js
  var require_market_values = __commonJS({
    "public/market-values.js"(exports, module) {
      ((root) => {
        function winningReturn(order) {
          const amount = order?.amount, quote = order?.quote;
          if (!Number.isFinite(amount) || amount <= 0 || !quote) return null;
          const payout = quote.shares ?? (quote.source === "offline-simulated" ? amount * quote.odds : NaN);
          if (!Number.isFinite(payout) || payout <= 0) return null;
          return { odds: payout / amount, payout, profit: payout - amount, loss: -amount };
        }
        function freshPrice(quote, symbol, now = Date.now()) {
          return quote?.symbol === symbol && Number.isFinite(quote.price) && quote.price > 0 && Number.isFinite(quote.tradeTime) && now - quote.tradeTime <= 15e3 && quote.tradeTime <= now + 2e3;
        }
        function betReferencePrice(order, snapshots) {
          if (Number.isFinite(order?.referencePrice) && order.referencePrice > 0) return order.referencePrice;
          const snapshot = snapshots?.get(order?.intent?.snapshotId);
          if (!snapshot || snapshot.type !== "MARKET_SNAPSHOT" || String(snapshot.roundId) !== String(order.start) || snapshot.market?.marketTopicId !== order.topicId) return null;
          const price = snapshot.indicators?.price;
          return Number.isFinite(price) && price > 0 ? price : null;
        }
        function pendingBets(orders, now) {
          const open = (orders || []).filter((order) => order.status === "OPEN");
          const current = open.filter((order) => order.start <= now && order.end > now);
          const previous = open.filter((order) => order.end <= now);
          const total = (rows) => Math.round(rows.reduce((sum, order) => sum + order.amount, 0) * 1e8) / 1e8;
          return { current, previous, currentAmount: total(current), previousAmount: total(previous) };
        }
        function valuationKey(battle) {
          return JSON.stringify([battle.id, battle.agents.map((agent) => [
            agent.id,
            agent.cash,
            agent.equity,
            agent.orders.filter((order) => order.status === "OPEN").map((order) => [order.id, order.topicId, order.tokenId, order.start, order.end, order.direction, order.amount, order.quote?.shares])
          ])]);
        }
        function equityEstimate(battle, valuation, now = Date.now()) {
          const matches = !battle.recovery && valuation?.battleId === battle.id && valuation.signature === valuationKey(battle);
          const agents = battle.agents.map((agent) => {
            const open = agent.orders.some((order) => order.status === "OPEN");
            const mark = matches ? valuation.agents?.find((row) => row.agentId === agent.id) : null;
            const valid = !open || Number.isFinite(mark?.estimatedEquity) && mark.validUntil > now && mark.asOf <= now + 2e3 && now - mark.asOf <= 1e4;
            const estimatedEquity2 = !open ? agent.equity : valid ? mark.estimatedEquity : null;
            const initialBalance = battle.config?.initialBalance + (agent.addedCapital || 0);
            return {
              id: agent.id,
              bookEquity: agent.equity,
              estimatedEquity: estimatedEquity2,
              floatingPnl: valid ? estimatedEquity2 - agent.equity : null,
              cumulativePnl: valid && Number.isFinite(initialBalance) ? estimatedEquity2 - initialBalance : null
            };
          });
          const estimatedEquity = agents.every((a) => a.estimatedEquity !== null) ? agents.reduce((sum, a) => sum + a.estimatedEquity, 0) : null;
          const initialTotal = (battle.initialTotal ?? battle.config?.initialBalance * agents.length) + (battle.addedCapital || 0);
          return {
            agents,
            bookEquity: agents.reduce((sum, a) => sum + a.bookEquity, 0),
            estimatedEquity,
            cumulativePnl: estimatedEquity !== null && Number.isFinite(initialTotal) ? estimatedEquity - initialTotal : null
          };
        }
        function equityTier(equity, initialBalance) {
          if (!Number.isFinite(equity) || !Number.isFinite(initialBalance) || initialBalance <= 0) return "normal";
          const multiple = equity / initialBalance;
          if (multiple >= 3) return "triple";
          if (multiple >= 2) return "double";
          return multiple < 0.5 ? "risk" : "normal";
        }
        function equityPerformance(equity, principal) {
          if (!Number.isFinite(equity) || !Number.isFinite(principal) || principal <= 0) return { state: "unavailable", text: "\u2014" };
          const multiple = equity / principal;
          const compact = (value) => Number(value.toFixed(2)).toString();
          if (multiple < 1) return { state: "loss", text: `-${compact((1 - multiple) * 100)}%` };
          if (multiple > 1) return { state: "profit", text: `x ${compact(multiple)}` };
          return { state: "flat", text: "0%" };
        }
        const values = { winningReturn, freshPrice, betReferencePrice, pendingBets, valuationKey, equityEstimate, equityTier, equityPerformance };
        if (typeof module === "object" && module.exports) module.exports = values;
        else {
          root.Warrior = root.Warrior || {};
          root.Warrior.marketValues = values;
        }
      })(globalThis);
    }
  });

  // position-valuation.js
  var require_position_valuation = __commonJS({
    "position-valuation.js"(exports, module) {
      var { validateMarket } = require_prediction_sim();
      var { valuationKey } = require_market_values();
      var fail = (code) => Object.assign(new Error(code), { code });
      function sellValue(book, tokenId, shares, now) {
        const at = Number(book?.timestamp);
        if (String(book?.tokenId) !== String(tokenId) || !Number.isFinite(at) || now - at > 1e4 || at > now + 2e3) throw fail("STALE_BOOK");
        if (!Number.isFinite(shares) || shares <= 0) throw fail("INVALID_SHARES");
        if (!Array.isArray(book.bids) || !book.bids.length) throw fail("NO_BIDS");
        const bids = book.bids.map((row) => ({ price: Number(row.price), size: Number(row.size) }));
        if (bids.some((row) => !Number.isFinite(row.price) || row.price < 0 || row.price > 1 || !Number.isFinite(row.size) || row.size <= 0)) throw fail("INVALID_BOOK");
        bids.sort((a, b) => b.price - a.price);
        let remaining = shares, value = 0;
        for (const row of bids) {
          const quantity = Math.min(remaining, row.size);
          value += quantity * row.price;
          remaining -= quantity;
          if (remaining < 1e-8) break;
        }
        if (remaining > 1e-8) throw fail("INSUFFICIENT_BIDS");
        return { value, asOf: at, validUntil: at + 1e4 };
      }
      function createPositionValuation({ source, now = Date.now }) {
        const cache = /* @__PURE__ */ new Map();
        function cached(key, read) {
          const found = cache.get(key);
          if (found && (found.pending || now() - found.at < 5e3)) return found.promise;
          let timer;
          const promise = Promise.race([Promise.resolve().then(read), new Promise((_, reject) => {
            timer = setTimeout(() => reject(fail("QUOTE_TIMEOUT")), 7e3);
          })]).finally(() => {
            clearTimeout(timer);
            const entry = cache.get(key);
            if (entry?.promise === promise) {
              entry.pending = false;
              entry.at = now();
            }
          });
          cache.set(key, { at: now(), promise, pending: true });
          if (cache.size > 200) {
            for (const [id, entry] of cache) if (now() - entry.at >= 5e3) cache.delete(id);
          }
          return promise;
        }
        return async function estimate(battle) {
          const signature = valuationKey(battle);
          const groups = /* @__PURE__ */ new Map();
          for (const agent of battle.agents) for (const order of agent.orders.filter((o) => o.status === "OPEN")) {
            const key = JSON.stringify([order.topicId, order.tokenId, order.start, order.end, order.direction]);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push({ agent, order });
          }
          const marks = /* @__PURE__ */ new Map();
          await Promise.all([...groups.values()].map(async (entries) => {
            const { order, agent } = entries[0];
            let mark;
            try {
              if (battle.recovery) throw fail(battle.recovery.code || "RECOVERY_WAIT");
              if (order.end <= now()) throw fail("AWAITING_SETTLEMENT");
              if (entries.some((entry) => !Number.isFinite(entry.order.quote?.shares) || entry.order.quote.shares <= 0)) throw fail("INVALID_SHARES");
              const topic = await cached(`topic:${order.topicId}`, () => source.detail(order.topicId));
              if (String(topic?.marketTopicId) !== String(order.topicId)) throw fail("MARKET_MISMATCH");
              validateMarket(topic, order.start, battle.config.asset || `${agent.policy.coin}USDT`, battle.config.roundMs);
              if (Number(topic.endDate) !== order.end || !["UP", "DOWN"].includes(order.direction)) throw fail("MARKET_MISMATCH");
              const market = topic.markets[0];
              if (["RESOLVED", "SETTLED", "CLOSED"].includes(market.status)) throw fail("AWAITING_SETTLEMENT");
              const token = market.outcomes.find((o) => o.name === (order.direction === "UP" ? "Up" : "Down"));
              if (String(token?.tokenId) !== String(order.tokenId)) throw fail("TOKEN_MISMATCH");
              const book = await cached(`book:${order.topicId}:${order.tokenId}`, () => source.book(topic, order.direction));
              const shares = entries.reduce((sum, entry) => sum + entry.order.quote.shares, 0);
              mark = sellValue(book, order.tokenId, shares, now());
              mark.validUntil = Math.min(mark.validUntil, order.end);
              if (mark.validUntil <= now()) throw fail("STALE_BOOK");
              entries.forEach((entry) => marks.set(entry.order, { ...mark, value: mark.value * entry.order.quote.shares / shares }));
            } catch (error) {
              entries.forEach((entry) => marks.set(entry.order, { reason: error.code || "QUOTE_UNAVAILABLE" }));
            }
          }));
          const agents = battle.agents.map((agent) => {
            const open = agent.orders.filter((o) => o.status === "OPEN"), values = open.map((o) => marks.get(o));
            const invalid = values.find((mark) => mark?.reason || !mark || mark.validUntil <= now());
            const available = !invalid && values.every(Boolean);
            const estimatedEquity = available ? agent.cash + values.reduce((sum, mark) => sum + mark.value, 0) : null;
            return {
              agentId: agent.id,
              bookEquity: agent.equity,
              estimatedEquity,
              floatingPnl: available ? estimatedEquity - agent.equity : null,
              reason: available ? null : invalid?.reason || "STALE_BOOK",
              asOf: open.length && available ? Math.min(...values.map((mark) => mark.asOf)) : null,
              validUntil: open.length && available ? Math.min(...values.map((mark) => mark.validUntil)) : null
            };
          });
          return { battleId: battle.id, signature, serverTime: now(), mode: "paper", basis: "sell-bid-depth", feesIncluded: false, agents };
        };
      }
      module.exports = { sellValue, createPositionValuation };
    }
  });

  // prediction-sim.js
  var require_prediction_sim = __commonJS({
    "prediction-sim.js"(exports, module) {
      var fs = require_fs();
      var path = require_path();
      var crypto = require_crypto2();
      var { roundContext } = require_round_direction();
      var { atomicWriteJson } = require_atomic_json();
      var { assertDecisionInputs, buildDecisionContext, decisionAudit, entrySignal, entryWaitReason, modelReview, normalizePolicy, rejectedDecisionAudit, validateDecision } = require_ai_decision();
      var { MIN_STAKE, capitalManagement, decisionStage, peerSnapshot } = require_strategy_catalog();
      var PERIODS = Object.freeze({
        "5m": 5 * 60 * 1e3,
        "15m": 15 * 60 * 1e3,
        "1h": 60 * 60 * 1e3,
        "1d": 24 * 60 * 60 * 1e3
      });
      var ROUND = PERIODS["5m"];
      var EASTERN_NOON_FORMATTER = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
      });
      var STAKE = 5;
      var ENTRY_POLL_MS = 5e3;
      var ENTRY_COOLDOWN_MS = 3e4;
      var ENTRY_CLOSE_BUFFER_MS = 3e4;
      var error = (code) => Object.assign(new Error(code), { code });
      function normalizeBattleEmotion(value = 0) {
        if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) throw error("INVALID_BATTLE_EMOTION");
        return value;
      }
      function normalizeBattleActionUrge(value = 0) {
        if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) throw error("INVALID_BATTLE_ACTION_URGE");
        return value;
      }
      function normalizeRealtimeEntry(value = false) {
        if (typeof value !== "boolean") throw error("INVALID_REALTIME_ENTRY");
        return value;
      }
      function decisionDiversity(auditTrail = [], windowSize = 50) {
        const grouped = /* @__PURE__ */ new Map();
        for (const event of auditTrail) {
          if (event?.type !== "DECISION" || !event.agentId || !["BET", "SKIP"].includes(event.decision?.action)) continue;
          const key = String(event.roundId ?? event.decision.roundId ?? "");
          if (!key) continue;
          if (!grouped.has(key)) grouped.set(key, /* @__PURE__ */ new Map());
          grouped.get(key).set(String(event.agentId), event.decision);
        }
        const rounds = [...grouped.values()].filter((items) => items.size >= 2).slice(-Math.max(1, windowSize));
        let pairs = 0, collisions = 0, directionPairs = 0, directionMatches = 0;
        for (const items of rounds) {
          const decisions = [...items.values()];
          for (let left = 0; left < decisions.length; left++) for (let right = left + 1; right < decisions.length; right++) {
            const a = decisions[left], b = decisions[right];
            pairs++;
            if (a.action === "BET" && b.action === "BET") {
              directionPairs++;
              if (a.direction === b.direction) directionMatches++;
              const aPct = Number(a.stakePct), bPct = Number(b.stakePct), sameStake = Number.isFinite(aPct) && Number.isFinite(bPct) ? Math.abs(aPct - bPct) <= 0.5 : Math.abs(Number(a.stake) - Number(b.stake)) <= 0.01;
              if (a.direction === b.direction && sameStake) collisions++;
            } else if (a.action === "SKIP" && b.action === "SKIP") collisions++;
          }
        }
        return {
          window: Math.max(1, windowSize),
          rounds: rounds.length,
          pairs,
          collisionRate: pairs ? collisions / pairs : null,
          directionAgreementRate: directionPairs ? directionMatches / directionPairs : null
        };
      }
      function normalizePeriod(value = "5m") {
        const period = String(value || "5m").toLowerCase();
        if (!Object.hasOwn(PERIODS, period)) throw error("INVALID_BATTLE_PERIOD");
        return period;
      }
      function easternParts(value) {
        return Object.fromEntries(EASTERN_NOON_FORMATTER.formatToParts(new Date(value)).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
      }
      function easternNoon(year, month, day) {
        const target = Date.UTC(year, month - 1, day, 12, 0, 0);
        let candidate = target;
        for (let index = 0; index < 3; index += 1) {
          const parts = easternParts(candidate);
          const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
          candidate += target - represented;
        }
        return candidate;
      }
      function nextRoundSlot(value, roundMs = ROUND) {
        const timestamp = Number(value);
        if (!Number.isFinite(timestamp) || !Object.values(PERIODS).includes(roundMs)) throw error("INVALID_BATTLE_PERIOD");
        if (roundMs !== PERIODS["1d"]) return (Math.floor(timestamp / roundMs) + 1) * roundMs;
        const local = easternParts(timestamp);
        let candidate = easternNoon(local.year, local.month, local.day);
        if (candidate <= timestamp) {
          const nextDate = new Date(Date.UTC(local.year, local.month - 1, local.day + 1));
          candidate = easternNoon(nextDate.getUTCFullYear(), nextDate.getUTCMonth() + 1, nextDate.getUTCDate());
        }
        return candidate;
      }
      function isRoundBoundary(value, roundMs = ROUND) {
        const timestamp = Number(value);
        if (!Number.isFinite(timestamp)) return false;
        if (roundMs !== PERIODS["1d"]) return timestamp % roundMs === 0;
        const local = easternParts(timestamp);
        return local.hour === 12 && local.minute === 0 && local.second === 0 && easternNoon(local.year, local.month, local.day) === timestamp;
      }
      function validateMarket(topic, slot, symbol = "BTCUSDT", roundMs = ROUND) {
        const market = topic?.markets?.[0];
        if (topic?.symbol !== symbol || topic.marketVariant !== "CRYPTO_UP_DOWN" || topic.collateral !== "USDT" || Number(topic.startDate) !== slot || Number(topic.endDate) !== slot + roundMs || !isRoundBoundary(slot, roundMs) || topic.markets?.length !== 1 || market?.outcomes?.length !== 2 || !["Up", "Down"].every((name) => market.outcomes.some((o) => o.name === name && o.tokenId))) throw error("INVALID_MARKET");
        return topic;
      }
      function quoteFromBook(book, tokenId, now, amount = STAKE) {
        const timestamp = Number(book?.timestamp);
        if (String(book?.tokenId) !== String(tokenId) || !Number.isFinite(timestamp) || now - timestamp > 1e4 || timestamp > now + 2e3) throw error("STALE_BOOK");
        if (!Array.isArray(book.asks) || !book.asks.length) throw error("NO_LIQUIDITY");
        const asks = book.asks.map((row) => ({ price: Number(row.price), size: Number(row.size) }));
        if (asks.some((row) => !Number.isFinite(row.price) || row.price <= 0 || row.price >= 1 || !Number.isFinite(row.size) || row.size <= 0)) throw error("INVALID_BOOK");
        asks.sort((a, b) => a.price - b.price);
        let remaining = amount, shares = 0;
        const fills = [];
        for (const row of asks) {
          const quantity = Math.min(row.size, remaining / row.price);
          shares += quantity;
          remaining -= quantity * row.price;
          fills.push({ price: row.price, shares: quantity });
          if (remaining < 1e-8) break;
        }
        if (remaining > 1e-8) throw error("INSUFFICIENT_LIQUIDITY");
        if (!Number.isFinite(shares) || shares <= 0) throw error("INVALID_BOOK");
        return { amount, shares, averagePrice: amount / shares, odds: shares / amount, bookTime: timestamp, fills, feesIncluded: false };
      }
      function createPredictionSource(run) {
        const detail = async (id) => (await run(["prediction", "market", "detail", "--marketTopicId", String(id)])).data;
        return {
          detail,
          async marketFor(slot, symbol = "BTCUSDT", roundMs = ROUND) {
            const query = { BTCUSDT: "Bitcoin", ETHUSDT: "Ethereum", BNBUSDT: "BNB" }[symbol];
            if (!query || !Object.values(PERIODS).includes(roundMs)) throw error("INVALID_MARKET");
            const { data } = await run(["prediction", "market", "search", "--query", query, "--limit", "50"]);
            const candidates = Array.isArray(data) ? data.filter((item) => item?.symbol === symbol && item.marketVariant === "CRYPTO_UP_DOWN" && Number(item.endDate) - Number(item.startDate) === roundMs) : [];
            if (!candidates.length) throw error("MARKET_NOT_FOUND");
            const direct = candidates.find((item) => Number(item.startDate) === slot && Number(item.endDate) === slot + roundMs);
            const timeline = candidates.flatMap((item) => Array.isArray(item.timeline) ? item.timeline : []).find((item) => Number(item.startDate) === slot && Number(item.endDate) === slot + roundMs);
            if (direct || timeline) return validateMarket(await detail((direct || timeline).marketTopicId), slot, symbol, roundMs);
            const closest = candidates.slice().sort((left, right) => Math.abs(Number(left.startDate) - slot) - Math.abs(Number(right.startDate) - slot)).slice(0, 3);
            const roots = await Promise.allSettled(closest.map((item) => detail(item.marketTopicId)));
            for (const result of roots) {
              if (result.status !== "fulfilled") continue;
              const root = result.value;
              if (Number(root?.startDate) === slot && Number(root?.endDate) === slot + roundMs) return validateMarket(root, slot, symbol, roundMs);
              const item = root?.timeline?.find((entry) => Number(entry.startDate) === slot && Number(entry.endDate) === slot + roundMs);
              if (item) return validateMarket(await detail(item.marketTopicId), slot, symbol, roundMs);
            }
            throw error("MARKET_NOT_FOUND");
          },
          async book(topic, direction) {
            const market = topic.markets[0];
            const token = market.outcomes.find((o) => o.name === (direction === "UP" ? "Up" : "Down"));
            return (await run(["prediction", "market", "order-book", "--marketId", String(market.marketId), "--tokenId", token.tokenId])).data;
          }
        };
      }
      function createPredictionSimulation({
        source,
        indicatorSource,
        decisionProvider,
        policyFor,
        agentPolicies,
        initialBalance = 100,
        maxRounds = null,
        asset = "BTCUSDT",
        period = "5m",
        emotionLevel = 0,
        actionUrgeLevel = 0,
        realtimeEntry = false,
        file,
        now = Date.now,
        random = () => crypto.randomInt(2),
        enabled = true,
        leaseEnabled = false,
        leaseMs = 3e4,
        pauseOnRestore = false,
        pauseOnError = false,
        onChange = () => {
        }
      }) {
        let normalizedAsset = ["BTCUSDT", "ETHUSDT", "BNBUSDT"].includes(String(asset).toUpperCase()) ? String(asset).toUpperCase() : "BTCUSDT";
        const normalizedPeriod = normalizePeriod(period);
        let roundMs = PERIODS[normalizedPeriod];
        const startingPolicies = Array.isArray(agentPolicies) && agentPolicies.length ? agentPolicies : ["A", "B", "C"].map((id) => ({ id }));
        const startingBalance = Math.max(0.01, Math.round(Number(initialBalance) * 100) / 100 || 100);
        const roundLimit = maxRounds === "until-loss" || maxRounds == null ? null : Math.max(1, Math.floor(Number(maxRounds)) || 1);
        const makeInitialAgents = () => startingPolicies.map((item, index) => {
          const id = String(item?.id || ["A", "B", "C"][index] || `agent-${index + 1}`);
          return { id, cash: startingBalance, orders: [], lastStatus: "WAITING", lastDecision: null, policy: normalizePolicy({ ...policyFor?.(id) || {}, ...item }, id) };
        });
        let state = {
          version: 2,
          enabled,
          lifecycle: enabled ? "running" : "paused",
          endReason: null,
          endedAt: null,
          rounds: [],
          auditTrail: [],
          config: { initialBalance: startingBalance, maxRounds: roundLimit, asset: normalizedAsset, period: normalizedPeriod, roundMs, emotionLevel: normalizeBattleEmotion(emotionLevel), actionUrgeLevel: normalizeBattleActionUrge(actionUrgeLevel), realtimeEntry: normalizeRealtimeEntry(realtimeEntry) },
          agents: makeInitialAgents(),
          lastSeenAt: leaseEnabled ? now() : null
        };
        const restored = Boolean(file && fs.existsSync(file));
        if (restored) {
          state = JSON.parse(fs.readFileSync(file, "utf8"));
          if (![1, 2].includes(state.version) || !Array.isArray(state.agents) || !state.agents.length || !Array.isArray(state.rounds) || state.agents.some((a) => typeof a.id !== "string" || !Number.isFinite(a.cash) || a.cash < 0 || !Array.isArray(a.orders))) throw error("INVALID_SIM_LEDGER");
          state.version = 2;
          state.lifecycle = state.lifecycle || (state.enabled === false ? "paused" : "running");
          state.endReason = state.endReason || null;
          state.endedAt = state.endedAt || null;
          state.config = { initialBalance: startingBalance, maxRounds: roundLimit, asset: normalizedAsset, period: normalizedPeriod, roundMs, ...state.config || {} };
          try {
            state.config.period = normalizePeriod(state.config.period ?? normalizedPeriod);
            state.config.roundMs = PERIODS[state.config.period];
          } catch {
            throw error("INVALID_SIM_LEDGER");
          }
          try {
            state.config.emotionLevel = normalizeBattleEmotion(state.config.emotionLevel ?? 0);
          } catch {
            throw error("INVALID_SIM_LEDGER");
          }
          try {
            state.config.actionUrgeLevel = normalizeBattleActionUrge(state.config.actionUrgeLevel ?? 0);
          } catch {
            throw error("INVALID_SIM_LEDGER");
          }
          try {
            state.config.realtimeEntry = normalizeRealtimeEntry(state.config.realtimeEntry ?? false);
          } catch {
            throw error("INVALID_SIM_LEDGER");
          }
          state.auditTrail = Array.isArray(state.auditTrail) ? state.auditTrail : [];
          state.lastSeenAt = state.lastSeenAt ?? (leaseEnabled ? now() : null);
        }
        normalizedAsset = state.config.asset;
        roundMs = state.config.roundMs;
        for (const agent of state.agents) agent.policy = normalizePolicy(agent.policy || policyFor?.(agent.id), agent.id);
        let storageFailed = false, storageIssue = null, controlVersion = 0;
        state.viewInstance = typeof state.viewInstance === "string" && state.viewInstance ? state.viewInstance : crypto.randomUUID();
        state.viewRevision = Number.isSafeInteger(state.viewRevision) && state.viewRevision >= 0 ? state.viewRevision : 0;
        state.updatedAt = Number.isFinite(state.updatedAt) ? state.updatedAt : now();
        const referencePrices = new Map(state.auditTrail.filter((event) => event.type === "MARKET_SNAPSHOT" && Number.isFinite(Number(event.indicators?.price))).map((event) => [event.id, Number(event.indicators.price)]));
        function markChanged(reason = "state") {
          state.viewRevision += 1;
          state.updatedAt = now();
          try {
            onChange({ version: `${state.viewInstance}:${state.viewRevision}`, updatedAt: state.updatedAt, reason });
          } catch {
          }
        }
        const viewMeta = () => ({ stateVersion: `${state.viewInstance}:${state.viewRevision}`, updatedAt: state.updatedAt });
        function record(type, fields = {}) {
          const event = structuredClone({ id: state.auditTrail.length + 1, type, recordedAt: now(), ...fields });
          event.hash = crypto.createHash("sha256").update(JSON.stringify(event)).digest("hex");
          state.auditTrail.push(event);
          if (type === "MARKET_SNAPSHOT" && Number.isFinite(Number(event.indicators?.price))) referencePrices.set(event.id, Number(event.indicators.price));
          return event.id;
        }
        function save(reason = "state") {
          markChanged(reason);
          if (!file) return;
          if (storageFailed) throw error("STORAGE_ERROR");
          try {
            atomicWriteJson(file, state);
          } catch (cause) {
            storageFailed = true;
            state.enabled = false;
            if (!["ended", "settling"].includes(state.lifecycle)) state.lifecycle = "paused";
            state.endReason = "STORAGE_ERROR";
            storageIssue = { code: cause.code || cause.name || "UNKNOWN", operation: cause.storageOperation || cause.syscall || "save", file: path.basename(file), at: now() };
            markChanged("storage-error");
            throw Object.assign(error("STORAGE_ERROR"), { storageIssue });
          }
        }
        if (restored && pauseOnRestore && state.enabled && !["ended", "settling"].includes(state.lifecycle)) {
          state.enabled = false;
          state.lifecycle = "paused";
          state.endReason = "SERVER_RESTARTED";
          record("PAUSED", { reason: state.endReason });
          save();
        }
        for (const a of state.agents) if (a.lastStatus === "QUOTING") a.lastStatus = "SKIPPED";
        let nextSlot = nextRoundSlot(now(), roundMs);
        let prepared = null, busy = false, lastPrepare = 0, lastSettle = 0, failure = null;
        const { RETRY_DELAYS, SETTLEMENT_POLL_MS, recoveryKind } = require_recovery_policy();
        let recoveryProbe = false;
        state.recovery = state.recovery || null;
        function enterRecovery(cause, stage = "market") {
          if (storageFailed || state.lifecycle === "ended" || cause?.code === "RECOVERY_WAIT") return;
          if (state.recovery) return;
          const code = cause?.code || cause?.name || "MARKET_UNAVAILABLE";
          controlVersion++;
          prepared = null;
          const kind = recoveryKind(code);
          state.recovery = {
            status: "retrying",
            code,
            kind,
            stage,
            attempts: 0,
            maxAttempts: kind === "settlement" ? null : RETRY_DELAYS.length,
            since: now(),
            lastAttemptAt: null,
            nextRetryAt: now() + (kind === "settlement" ? SETTLEMENT_POLL_MS : RETRY_DELAYS[0])
          };
          record("RECOVERY_STARTED", { code, stage });
          save("recovery-started");
        }
        async function readSource(method, ...args) {
          if (state.recovery && !recoveryProbe) throw error("RECOVERY_WAIT");
          try {
            return await source[method](...args);
          } catch (cause) {
            if (!["QUOTE_WINDOW_MISSED", "INSUFFICIENT_LIQUIDITY", "INSUFFICIENT_DEPTH"].includes(cause.code)) enterRecovery(cause, method);
            throw cause;
          }
        }
        async function recover() {
          const recovery = state.recovery;
          if (!recovery) return;
          const waitingForSettlement = recovery.kind === "settlement";
          if (waitingForSettlement && (recovery.status === "exhausted" || recovery.maxAttempts !== null)) {
            recovery.status = "retrying";
            recovery.attempts = 0;
            recovery.maxAttempts = null;
            recovery.nextRetryAt = now() + SETTLEMENT_POLL_MS;
            save("settlement-wait-restored");
          }
          if (recovery.status === "exhausted") return;
          if (!waitingForSettlement && recovery.attempts >= RETRY_DELAYS.length) {
            recovery.status = "exhausted";
            recovery.nextRetryAt = null;
            save("recovery-exhausted");
            return;
          }
          if (now() < recovery.nextRetryAt) return;
          if (!waitingForSettlement) recovery.attempts++;
          recovery.lastAttemptAt = now();
          recovery.nextRetryAt = now() + (waitingForSettlement ? SETTLEMENT_POLL_MS : RETRY_DELAYS[Math.min(recovery.attempts, RETRY_DELAYS.length - 1)]);
          save("recovery-attempt");
          recoveryProbe = true;
          try {
            await settle();
            const groups = /* @__PURE__ */ new Map();
            for (const agent of state.agents) for (const order of agent.orders.filter((o) => o.status === "OPEN")) {
              const key = `${order.topicId}:${order.tokenId}`;
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key).push(order);
            }
            for (const orders of groups.values()) {
              const order = orders[0], topic = await readSource("detail", order.topicId);
              validateMarket(topic, order.start, normalizedAsset, roundMs);
              const token = topic.markets[0].outcomes.find((o) => o.name === (order.direction === "UP" ? "Up" : "Down"));
              if (String(topic.marketTopicId) !== String(order.topicId) || String(token?.tokenId) !== String(order.tokenId)) throw error("MARKET_MISMATCH");
              if (order.end <= now() || ["RESOLVED", "SETTLED", "CLOSED"].includes(topic.markets[0].status)) throw error("AWAITING_SETTLEMENT");
              const book = await readSource("book", topic, order.direction);
              require_position_valuation().sellValue(book, order.tokenId, orders.reduce((sum, o) => sum + o.quote.shares, 0), now());
            }
            if (recovery.stage === "indicators") await indicatorSource.snapshot(normalizedAsset, state.config.period);
            nextSlot = nextRoundSlot(now(), roundMs);
            if (state.lifecycle !== "settling") {
              const currentSlot = nextSlot - roundMs;
              const canResume = integratedDecisions && state.enabled && state.config.realtimeEntry && now() < nextSlot - ENTRY_CLOSE_BUFFER_MS && (!state.config.maxRounds || state.rounds.includes(currentSlot) || state.rounds.length < state.config.maxRounds);
              if (canResume) {
                const old = state.entryRound?.slot === currentSlot ? state.entryRound : null;
                const candidate = await readSource(old ? "detail" : "marketFor", old ? old.market.marketTopicId : currentSlot, normalizedAsset, roundMs);
                validateMarket(candidate, currentSlot, normalizedAsset, roundMs);
                if (old && String(candidate.marketTopicId) !== String(old.market.marketTopicId)) throw error("MARKET_MISMATCH");
                if (candidate.markets[0].tradingStatus !== "OPEN" || ["RESOLVED", "SETTLED", "CLOSED"].includes(candidate.markets[0].status)) throw error("QUOTE_WINDOW_MISSED");
                await indicatorSource.snapshot(normalizedAsset, state.config.period);
                state.entryRound = { slot: currentSlot, market: candidate, oracles: old?.oracles || {}, attempts: old?.attempts || {} };
                if (!state.rounds.includes(currentSlot)) {
                  state.rounds.push(currentSlot);
                  record("ROUND_STARTED", { roundId: String(currentSlot), marketTopicId: candidate.marketTopicId, resumed: true });
                }
                lastEntryPoll = -Infinity;
                record("ROUND_RESUMED", { roundId: String(currentSlot) });
              } else {
                const candidate = await readSource("marketFor", nextSlot, normalizedAsset, roundMs);
                validateMarket(candidate, nextSlot, normalizedAsset, roundMs);
                if (state.enabled) prepared = candidate;
              }
            }
            state.recovery = null;
            failure = null;
            lastSettle = now();
            record("RECOVERY_SUCCEEDED", { attempts: recovery.attempts });
            save("recovery-succeeded");
          } catch (cause) {
            if (storageFailed) throw cause;
            recovery.code = cause.code || cause.name || "MARKET_UNAVAILABLE";
            recovery.kind = recoveryKind(recovery.code);
            if (recovery.kind === "settlement") {
              recovery.attempts = 0;
              recovery.maxAttempts = null;
              recovery.status = "retrying";
              recovery.nextRetryAt = now() + SETTLEMENT_POLL_MS;
            } else {
              if (waitingForSettlement) recovery.attempts = 0;
              recovery.maxAttempts = RETRY_DELAYS.length;
              recovery.status = recovery.attempts >= RETRY_DELAYS.length ? "exhausted" : "retrying";
              recovery.nextRetryAt = recovery.status === "exhausted" ? null : now() + RETRY_DELAYS[recovery.attempts];
            }
            prepared = null;
            record("RECOVERY_FAILED", { code: recovery.code, attempt: recovery.attempts, exhausted: recovery.status === "exhausted" });
            save("recovery-failed");
          } finally {
            recoveryProbe = false;
          }
        }
        let lastEntryPoll = -Infinity;
        const integratedDecisions = Boolean(indicatorSource && decisionProvider && policyFor);
        const restoredRound = state.rounds.at(-1);
        if (!state.entryRound && restoredRound != null && now() < restoredRound + roundMs) {
          const evidence = state.auditTrail.find((e) => e.type === "MARKET_SNAPSHOT" && e.roundId === String(restoredRound));
          if (evidence) {
            state.entryRound = { slot: restoredRound, market: evidence.market, oracles: {}, attempts: {} };
            for (const event of state.auditTrail.filter((e) => e.type === "DECISION_INPUT" && e.roundId === String(restoredRound))) {
              if (event.input.divination) state.entryRound.oracles[event.agentId] = event.input.divination;
            }
          }
        }
        function policy(id) {
          return structuredClone(state.agents.find((agent) => agent.id === id).policy);
        }
        function streaks(orders) {
          const settled = orders.filter((order) => ["WON", "LOST"].includes(order.status)).slice().reverse();
          if (!settled.length) return { winStreak: 0, lossStreak: 0 };
          const status = settled[0].status;
          const count = settled.findIndex((order) => order.status !== status);
          const length = count === -1 ? settled.length : count;
          return status === "WON" ? { winStreak: length, lossStreak: 0 } : { winStreak: 0, lossStreak: length };
        }
        function capitalForAgent(a) {
          return capitalManagement({ strategy: a.policy.strategy, balance: a.cash, initialBalance: state.config.initialBalance + (a.addedCapital || 0), openStake: a.orders.filter((o) => o.status === "OPEN").reduce((sum, o) => sum + o.amount, 0), recoveryActive: a.capitalRecovery });
        }
        const minimumStake = (a) => capitalForAgent(a).recoveryActive ? 0.01 : MIN_STAKE;
        function account(a) {
          const open = a.orders.filter((order) => order.status === "OPEN");
          const wins = a.orders.filter((order) => order.status === "WON").length;
          const losses = a.orders.filter((order) => order.status === "LOST").length;
          const initialBalance2 = state.config.initialBalance + (a.addedCapital || 0), openStake = open.reduce((sum, order) => sum + order.amount, 0);
          const recovery = capitalForAgent(a).recoveryActive;
          if (recovery !== Boolean(a.capitalRecovery)) {
            a.capitalRecovery = recovery;
            save("capital-mode");
          }
          return { balance: a.cash, initialBalance: initialBalance2, openStake, capitalRecovery: a.capitalRecovery, wins, losses, ...streaks(a.orders) };
        }
        function touchState() {
          if (leaseEnabled) state.lastSeenAt = now();
        }
        const hasOpenOrders = () => state.agents.some((agent) => agent.orders.some((order) => order.status === "OPEN"));
        function finish(reason = "MANUAL") {
          if (["ended", "settling"].includes(state.lifecycle)) return;
          controlVersion++;
          state.enabled = false;
          state.lifecycle = "settling";
          state.endReason = reason;
          finalize();
          save();
        }
        function finalize() {
          if (storageFailed) return;
          if (state.lifecycle !== "settling" || hasOpenOrders() || busy) return;
          state.lifecycle = "ended";
          state.endedAt = now();
          prepared = null;
          state.recovery = null;
          failure = null;
          state.report = snapshot();
          save();
        }
        function compactOrder(order, references) {
          const settlement = order.settlement ? { ...order.settlement } : null;
          if (settlement) delete settlement.evidence;
          const referencePrice = Number(order.referencePrice ?? references.get(order.intent?.snapshotId));
          return {
            id: order.id,
            topicId: order.topicId,
            start: order.start,
            end: order.end,
            tokenId: order.tokenId,
            direction: order.direction,
            amount: order.amount,
            marketSource: order.marketSource,
            quote: order.quote ? { amount: order.quote.amount, shares: order.quote.shares, averagePrice: order.quote.averagePrice, odds: order.quote.odds, feesIncluded: order.quote.feesIncluded, source: order.quote.source, expiresAt: order.quote.expiresAt, minReceive: order.quote.minReceive, feeShares: order.quote.feeShares, gasIncluded: order.quote.gasIncluded } : null,
            intent: order.intent || null,
            status: order.status,
            placedAt: order.placedAt,
            payout: order.payout,
            settledAt: order.settledAt,
            settlement,
            referencePrice: Number.isFinite(referencePrice) && referencePrice > 0 ? referencePrice : null
          };
        }
        function buildSnapshot({ compact = false, includeOrders = true } = {}) {
          const active = state.agents.flatMap((a) => a.orders).find((o) => o.start <= now() && o.end > now());
          const status = ["ended", "settling"].includes(state.lifecycle) ? state.lifecycle : state.recovery ? state.recovery.kind === "settlement" ? "awaiting-settlement" : state.recovery.status === "exhausted" ? "retry-paused" : "reconnecting" : state.enabled ? "running" : "paused";
          const references = compact && includeOrders ? referencePrices : null;
          const marketSource = state.entryRound?.market?.marketSource || prepared?.marketSource || source.describe?.().nextMarketSource || "binance-prediction";
          const feesIncluded = state.agents.every((a) => a.orders.every((o) => o.quote?.feesIncluded === true));
          return {
            mode: "paper",
            marketSource,
            sourceStatus: source.describe?.() || null,
            pricing: marketSource === "public-spot" ? "practice-fixed" : source.quote ? "real-book-fee-estimate" : "real-order-book",
            feesIncluded,
            gasIncluded: false,
            enabled: state.enabled,
            status,
            decisionEngine: decisionProvider?.describe?.() || { mode: "legacy", configured: false, simulated: true },
            diversity: decisionDiversity(state.auditTrail),
            roundCount: state.rounds.length,
            activeMarket: active ? { id: active.topicId, start: active.start, end: active.end } : null,
            serverTime: now(),
            nextSlot,
            market: prepared ? { id: prepared.marketTopicId, title: prepared.title, start: prepared.startDate, end: prepared.endDate } : null,
            config: { ...state.config, rounds: state.config.maxRounds, agents: state.agents.map((a) => policy(a.id)) },
            initialTotal: state.agents.length * Number(state.config.initialBalance || startingBalance),
            addedCapital: state.agents.reduce((sum, a) => sum + (a.addedCapital || 0), 0),
            endedAt: state.endedAt,
            endReason: state.endReason,
            aiConnectionFailure: state.aiConnectionFailure || null,
            error: storageFailed ? "STORAGE_ERROR" : state.recovery?.code || failure,
            recovery: state.recovery,
            storageIssue,
            ...viewMeta(),
            auditTrail: compact ? [] : state.auditTrail,
            agents: state.agents.map((a) => {
              const open = a.orders.filter((o) => o.status === "OPEN");
              const wins = a.orders.filter((o) => o.status === "WON").length;
              const losses = a.orders.filter((o) => o.status === "LOST").length;
              const totalDebits = a.orders.reduce((sum, order) => sum + order.amount, 0);
              const totalCredits = a.orders.reduce((sum, order) => sum + (order.payout || 0), 0);
              const expectedCash = Math.round((state.config.initialBalance + (a.addedCapital || 0) - totalDebits + totalCredits) * 1e8) / 1e8;
              const orders = !includeOrders ? [] : compact ? a.orders.map((order) => compactOrder(order, references)) : a.orders;
              const watching = state.enabled && !state.recovery && state.config.realtimeEntry && state.entryRound && now() < state.entryRound.slot + roundMs - ENTRY_CLOSE_BUFFER_MS && a.cash >= minimumStake(a) && a.lastStatus !== "QUOTING" && !a.orders.some((order) => order.start === state.entryRound.slot);
              return {
                ...a,
                lastStatus: watching ? "WATCHING" : a.lastStatus,
                policy: policy(a.id),
                orders,
                reserved: open.reduce((sum, order) => sum + order.amount, 0),
                reconciliation: {
                  mode: "paper",
                  initialBalance: state.config.initialBalance,
                  addedCapital: a.addedCapital || 0,
                  totalDebits,
                  totalCredits,
                  expectedCash,
                  actualCash: a.cash,
                  difference: Math.round((a.cash - expectedCash) * 1e8) / 1e8,
                  matched: Math.abs(a.cash - expectedCash) < 1e-7,
                  feesIncluded: a.orders.every((o) => o.quote?.feesIncluded === true)
                },
                equity: a.cash + open.reduce((sum, order) => sum + order.amount, 0),
                wins,
                losses,
                winRate: wins + losses ? wins / (wins + losses) : null,
                latest: orders.at(-1) || null
              };
            })
          };
        }
        function snapshot() {
          if (state.lifecycle === "ended" && state.report) return { ...structuredClone(state.report), ...viewMeta() };
          return structuredClone(buildSnapshot());
        }
        function liveSnapshot() {
          return structuredClone(buildSnapshot({ compact: true }));
        }
        function summary() {
          const full = buildSnapshot({ compact: true, includeOrders: false });
          return structuredClone({
            mode: full.mode,
            marketSource: full.marketSource,
            sourceStatus: full.sourceStatus,
            pricing: full.pricing,
            feesIncluded: full.feesIncluded,
            enabled: full.enabled,
            status: full.status,
            decisionEngine: full.decisionEngine,
            roundCount: full.roundCount,
            serverTime: full.serverTime,
            nextSlot: full.nextSlot,
            market: full.market,
            config: full.config,
            diversity: full.diversity,
            initialTotal: full.initialTotal,
            addedCapital: full.addedCapital,
            endedAt: full.endedAt,
            endReason: full.endReason,
            error: full.error,
            recovery: full.recovery,
            storageIssue: full.storageIssue,
            stateVersion: full.stateVersion,
            updatedAt: full.updatedAt,
            agents: full.agents.map((agent) => ({
              id: agent.id,
              cash: agent.cash,
              addedCapital: agent.addedCapital || 0,
              reserved: agent.reserved,
              equity: agent.equity,
              wins: agent.wins,
              losses: agent.losses,
              winRate: agent.winRate,
              lastStatus: agent.lastStatus,
              policy: agent.policy
            }))
          });
        }
        async function settle() {
          const ids = [...new Set(state.agents.flatMap((a) => a.orders.filter((o) => o.status === "OPEN" && o.end <= now()).map((o) => o.topicId)))];
          for (const id of ids) {
            let topic;
            topic = await readSource("detail", id);
            if (String(topic?.marketTopicId) !== String(id)) throw error("MARKET_MISMATCH");
            const orders = state.agents.flatMap((a) => a.orders.filter((o) => o.topicId === id && o.status === "OPEN"));
            const ref = orders[0];
            validateMarket(topic, ref.start, normalizedAsset, roundMs);
            const market = topic.markets[0];
            if (!["RESOLVED", "SETTLED"].includes(market.status)) throw error("MARKET_RESULT_PENDING");
            const winners = market.outcomes.filter((o) => o.winner === true);
            const split = market.outcomes.every((o) => Number(o.price) === 0.5) && Number.isFinite(topic.variantData?.endPrice) && topic.variantData.endPrice === topic.variantData.startPrice;
            if (!split && (winners.length !== 1 || market.outcomes.some((o) => typeof o.winner !== "boolean"))) {
              throw error("MARKET_RESULT_PENDING");
            }
            const evidenceEventId = record("SETTLEMENT_EVIDENCE", { roundId: String(ref.start), marketTopicId: id, evidence: structuredClone(topic) });
            for (const a of state.agents) for (const o of a.orders) {
              if (o.topicId !== id || o.status !== "OPEN" || o.end > now()) continue;
              o.status = split ? "SPLIT" : String(winners[0].tokenId) === o.tokenId ? "WON" : "LOST";
              o.payout = split ? o.quote.shares * 0.5 : o.status === "WON" ? o.quote.shares : 0;
              o.settledAt = now();
              const cashBefore = a.cash;
              a.cash = Math.round((a.cash + o.payout) * 1e8) / 1e8;
              o.settlement = {
                source: o.marketSource === "public-spot" ? "public-spot-practice" : "official-market",
                mode: "paper",
                observedAt: now(),
                marketTopicId: id,
                officialStatus: market.status,
                officialOutcome: split ? "SPLIT" : winners[0].name,
                shares: o.quote.shares,
                payoutPerShare: split ? 0.5 : o.status === "WON" ? 1 : 0,
                payout: o.payout,
                netProfit: o.payout - o.amount,
                cashBefore,
                cashAfter: a.cash,
                feesIncluded: o.quote.feesIncluded === true,
                evidenceEventId
              };
              record("SETTLEMENT", { roundId: String(o.start), agentId: a.id, orderId: o.id, settlement: o.settlement });
            }
            save("settlement");
          }
        }
        async function decideRound(market, slot, attemptVersion, signalOnly = false) {
          const deadlineMs = signalOnly ? Math.min(now() + 1e4, slot + roundMs - ENTRY_CLOSE_BUFFER_MS) : slot + 1e4;
          const validAttempt = () => state.enabled && !state.recovery && attemptVersion === controlVersion && !storageFailed && now() < deadlineMs && (!signalOnly || state.config.realtimeEntry);
          try {
            if (signalOnly && (market.markets[0].tradingStatus !== "OPEN" || ["RESOLVED", "SETTLED"].includes(market.markets[0].status))) throw error("QUOTE_WINDOW_MISSED");
            const [indicators, upBook, downBook] = await Promise.all([
              indicatorSource.snapshot(normalizedAsset, state.config.period).catch((cause) => {
                enterRecovery(cause, "indicators");
                throw cause;
              }),
              readSource("book", market, "UP"),
              readSource("book", market, "DOWN")
            ]);
            if (!validAttempt()) return;
            if (signalOnly && (!Number.isFinite(indicators.dataTimestamp) || now() - indicators.dataTimestamp > 1e4 || indicators.dataTimestamp > now() + 2e3)) throw error("AI_DATA_STALE");
            let snapshotId;
            const captureSnapshot = () => snapshotId ??= record("MARKET_SNAPSHOT", { roundId: String(slot), market, indicators, books: { up: upBook, down: downBook } });
            if (!signalOnly) captureSnapshot();
            const upToken = String(market.markets[0].outcomes.find((o) => o.name === "Up").tokenId);
            const downToken = String(market.markets[0].outcomes.find((o) => o.name === "Down").tokenId);
            const upPreview = quoteFromBook(upBook, upToken, now(), 1);
            const downPreview = quoteFromBook(downBook, downToken, now(), 1);
            const marketInput = {
              roundId: slot,
              timeframe: state.config.period,
              roundDurationSeconds: roundMs / 1e3,
              secondsToClose: Math.max(0, (slot + roundMs - now()) / 1e3),
              upOdds: upPreview.odds,
              downOdds: downPreview.odds,
              dataTimestamp: Math.min(upPreview.bookTime, downPreview.bookTime, indicators.dataTimestamp),
              roundContext: roundContext(market, indicators, slot, roundMs / 1e3, indicators.dataTimestamp)
            };
            failure = null;
            for (const stage of [0, 1, 2]) {
              if (signalOnly && !validAttempt()) break;
              const peers = peerSnapshot(state.agents.map((a) => ({ ...a, policy: policy(a.id) })), slot, normalizedAsset, now(), state.config.initialBalance);
              let oracleChanged = false;
              const decisionJobs = state.agents.filter((a) => (signalOnly ? a.cash >= minimumStake(a) && !a.orders.some((o) => o.start === slot) : a.lastStatus === "QUOTING") && decisionStage(policy(a.id).strategy) === stage).flatMap((a) => {
                let entryKey;
                const currentPolicy = policy(a.id);
                const input = buildDecisionContext({
                  market: marketInput,
                  indicators,
                  account: account(a),
                  policy: currentPolicy,
                  battleEmotion: state.config.emotionLevel,
                  battleActionUrge: state.config.actionUrgeLevel,
                  peers,
                  frozenDivination: state.entryRound?.oracles[a.id]
                });
                const engine = decisionProvider.describeFor?.(input) || decisionProvider.describe();
                const external = !["mock", "off", "offline", "legacy"].includes(engine.mode);
                if (external) input.policy.review_mode = "model";
                input.policy.controls_revision = state.config.controlsRevision || 0;
                if (input.divination && state.entryRound && !state.entryRound.oracles[a.id]) {
                  state.entryRound.oracles[a.id] = input.divination;
                  oracleChanged = true;
                }
                if (signalOnly) {
                  input.market.entry_mode = "signal";
                  input.market.seconds_to_close = Math.max(0, (slot + roundMs - now()) / 1e3);
                  const previous = state.entryRound.attempts[a.id];
                  let opportunity;
                  try {
                    const candle = indicators.indicatorCandleCloseTime ?? indicators.candles?.bars?.at(-1)?.closeTime;
                    if (external) opportunity = modelReview(input, candle, previous, now());
                    else {
                      const signal = entrySignal(input, candle);
                      opportunity = !signal ? { reason: entryWaitReason(input) } : previous && (now() - previous.at < ENTRY_COOLDOWN_MS || previous.keys.includes(signal.key)) ? { reason: "AI_WAIT_MARKET_CHANGE" } : signal;
                    }
                  } catch (cause) {
                    opportunity = { reason: cause.code || "AI_INDICATOR_MISSING" };
                  }
                  if (!opportunity.key) {
                    a.waitReason = opportunity.reason;
                    if (a.lastStatus === "QUOTING") {
                      a.lastStatus = "SKIPPED";
                      a.reason = opportunity.reason;
                    }
                    return [];
                  }
                  state.entryRound.attempts[a.id] = { at: now(), keys: [...previous?.keys || [], opportunity.key], count: (previous?.count ?? previous?.keys?.length ?? 0) + 1 };
                  entryKey = opportunity.key;
                  a.lastStatus = "QUOTING";
                } else if (currentPolicy.strategy === "showoff" && !entrySignal(input)) {
                  a.lastStatus = "SKIPPED";
                  a.reason = a.waitReason = "WAIT_CZ_BET";
                  return [];
                }
                a.waitReason = null;
                const inputEventId = record("DECISION_INPUT", { roundId: String(slot), agentId: a.id, snapshotId: captureSnapshot(), input, policy: currentPolicy, ...entryKey ? { entryKey } : {} });
                return { a, currentPolicy, input, inputEventId, entryKey };
              });
              if (signalOnly && !decisionJobs.length) {
                if (oracleChanged) save("round-reading");
                continue;
              }
              save("decision-inputs");
              await Promise.all(decisionJobs.map(async ({ a, currentPolicy, input, inputEventId, entryKey }) => {
                if (a.lastStatus !== "QUOTING") return;
                try {
                  assertDecisionInputs(input);
                  if (signalOnly && !validAttempt()) throw error("QUOTE_WINDOW_MISSED");
                  const raw = await decisionProvider.decide(input, { deadlineMs, now, isCancelled: () => !validAttempt(), onRequest: (request) => {
                    if (!validAttempt()) throw error("QUOTE_WINDOW_MISSED");
                    record("MODEL_REQUEST", { roundId: String(slot), agentId: a.id, inputEventId, request });
                    save("model-request");
                  } });
                  record("MODEL_RESPONSE", { roundId: String(slot), agentId: a.id, inputEventId, response: raw });
                  if (!state.enabled || attemptVersion !== controlVersion) throw error("QUOTE_WINDOW_MISSED");
                  const plan = validateDecision(raw, { input, indicators, policy: currentPolicy, now: now() });
                  const audit = decisionAudit({ provider: decisionProvider, input, plan, indicators, raw });
                  a.lastDecision = audit;
                  if (plan.action === "SKIP") {
                    record("DECISION", { roundId: String(slot), agentId: a.id, inputEventId, risk: "ACCEPTED_SKIP", decision: audit });
                    a.lastStatus = "SKIPPED";
                    a.reason = plan.reason || "AI_SKIPPED";
                    return;
                  }
                  if (!validAttempt() || market.markets[0].tradingStatus !== "OPEN") throw error("QUOTE_WINDOW_MISSED");
                  const tokenId = plan.direction === "UP" ? upToken : downToken;
                  let executionBook = plan.direction === "UP" ? upBook : downBook;
                  if (signalOnly) {
                    const [freshMarket, freshBook] = await Promise.all([readSource("detail", market.marketTopicId), readSource("book", market, plan.direction)]);
                    validateMarket(freshMarket, slot, normalizedAsset, roundMs);
                    if (String(freshMarket.marketTopicId) !== String(market.marketTopicId) || freshMarket.markets[0].tradingStatus !== "OPEN" || ["RESOLVED", "SETTLED"].includes(freshMarket.markets[0].status) || !validAttempt()) throw error("QUOTE_WINDOW_MISSED");
                    executionBook = freshBook;
                    record("ENTRY_EXECUTION_CHECK", { roundId: String(slot), agentId: a.id, inputEventId, market: freshMarket, book: freshBook });
                  }
                  if (a.orders.some((o) => o.start === slot)) throw error("ROUND_ALREADY_ENTERED");
                  const quote = source.quote ? await readSource("quote", market, plan.direction, plan.stake, executionBook) : quoteFromBook(executionBook, tokenId, now(), plan.stake);
                  if (!validAttempt()) throw error("QUOTE_WINDOW_MISSED");
                  const executionEdge = plan.confidence / 100 * quote.odds - 1;
                  if (executionEdge <= 0) throw error("AI_EDGE_LOST_TO_SLIPPAGE");
                  audit.expectedEdge = executionEdge;
                  record("DECISION", { roundId: String(slot), agentId: a.id, inputEventId, risk: "ACCEPTED_BET", decision: audit });
                  const cashBefore = a.cash;
                  const intent = {
                    id: `${slot}-${a.id}`,
                    agentId: a.id,
                    roundId: String(slot),
                    inputEventId,
                    snapshotId,
                    marketTopicId: market.marketTopicId,
                    tokenId,
                    direction: plan.direction,
                    amount: plan.stake,
                    side: "BUY",
                    orderType: "MARKET",
                    expiresAt: quote.expiresAt ? Math.min(quote.expiresAt, slot + roundMs - ENTRY_CLOSE_BUFFER_MS) : deadlineMs,
                    createdAt: now(),
                    mode: "paper",
                    simulationOnly: plan.stake < MIN_STAKE,
                    marketSource: market.marketSource || "binance-prediction",
                    paperEstimate: { shares: quote.shares, averagePrice: quote.averagePrice, source: quote.source || "real-order-book", feeShares: quote.feeShares ?? null }
                  };
                  record("ORDER_INTENT", { roundId: String(slot), agentId: a.id, intent });
                  a.cash = Math.round((a.cash - plan.stake) * 1e8) / 1e8;
                  const order = {
                    id: `${slot}-${a.id}`,
                    topicId: market.marketTopicId,
                    start: slot,
                    end: slot + roundMs,
                    tokenId,
                    direction: plan.direction,
                    amount: plan.stake,
                    quote,
                    marketSource: intent.marketSource,
                    decision: audit,
                    intent,
                    referencePrice: indicators.price,
                    cashBefore,
                    cashAfter: a.cash,
                    status: "OPEN",
                    placedAt: now()
                  };
                  if (!Number.isFinite(Number(order.referencePrice)) || Number(order.referencePrice) <= 0) delete order.referencePrice;
                  a.orders.push(order);
                  record("PAPER_ORDER", { roundId: String(slot), agentId: a.id, orderId: intent.id, cashBefore, cashAfter: a.cash, quote });
                  a.lastStatus = "OPEN";
                  a.reason = plan.reason;
                } catch (e) {
                  if (signalOnly && e.requestStarted === false && state.entryRound?.slot === slot) {
                    const attempt = state.entryRound.attempts[a.id];
                    attempt.keys = attempt.keys.filter((key) => key !== entryKey);
                    attempt.count = Math.max(0, (attempt.count || 1) - 1);
                  }
                  a.lastStatus = "SKIPPED";
                  a.reason = e.code || "AI_DECISION_FAILED";
                  a.lastDecision = a.lastDecision?.roundId === input.market.round_id ? { ...a.lastDecision, action: "REJECTED", reason: a.reason } : rejectedDecisionAudit({ provider: decisionProvider, input, indicators, reason: a.reason });
                  record("DECISION", { roundId: String(slot), agentId: a.id, inputEventId, risk: "REJECTED", decision: a.lastDecision });
                }
              }));
              save("decisions");
            }
          } catch (e) {
            const previousFailure = failure;
            failure = e.code || "INDICATORS_UNAVAILABLE";
            if (signalOnly && previousFailure === failure) return;
            record("INPUT_FAILED", { roundId: String(slot), reason: failure });
            for (const a of state.agents) if (a.lastStatus === "QUOTING") {
              a.lastStatus = "SKIPPED";
              a.reason = failure;
            }
            save("input-failed");
          }
        }
        async function tick() {
          if (busy || storageFailed) return;
          busy = true;
          try {
            const tickStartedAt = now();
            if (leaseEnabled && state.enabled && state.lastSeenAt != null && now() - state.lastSeenAt > leaseMs) {
              state.enabled = false;
              state.lifecycle = "paused";
              state.endReason = "CLIENT_DISCONNECTED";
              save();
            }
            if (state.lifecycle === "ended") return;
            if (state.recovery) {
              await recover();
              return;
            }
            if (state.agents.some((a) => a.orders.some((o) => o.status === "OPEN" && o.end <= now()))) {
              if (now() - lastSettle < 15e3) return;
              lastSettle = now();
              try {
                await settle();
              } catch (cause) {
                enterRecovery(cause, "settlement");
                return;
              }
            }
            if (state.config.realtimeEntry && state.config.maxRounds && state.rounds.length >= state.config.maxRounds && now() >= state.rounds.at(-1) + roundMs) finish("ROUND_LIMIT");
            const slot = nextSlot;
            const attemptVersion = controlVersion;
            if (now() >= slot) {
              nextSlot = nextRoundSlot(now(), roundMs);
              let market = prepared;
              prepared = null;
              if (state.enabled && !state.rounds.includes(slot)) {
                const onBoundary = tickStartedAt - slot <= 1500;
                if (onBoundary && source.refreshMarket) {
                  try {
                    market = await readSource("refreshMarket", market, slot, normalizedAsset, roundMs);
                  } catch (e) {
                    market = null;
                    failure = e.code || "MARKET_UNAVAILABLE";
                  }
                }
                if (state.recovery) return;
                state.rounds.push(slot);
                record("ROUND_STARTED", { roundId: String(slot), marketTopicId: market?.marketTopicId || null });
                const eligible = state.enabled && attemptVersion === controlVersion && onBoundary && now() - slot < 1e4 && market && Number(market.startDate) === slot;
                state.entryRound = eligible ? { slot, market, oracles: {}, attempts: {} } : null;
                lastEntryPoll = now();
                for (const a of state.agents) a.lastStatus = !state.enabled ? "PAUSED" : a.cash < (integratedDecisions ? minimumStake(a) : STAKE) ? "INSUFFICIENT_FUNDS" : eligible ? "QUOTING" : "SKIPPED";
                for (const a of state.agents) if (a.lastStatus !== "QUOTING") record("ROUND_SKIPPED", { roundId: String(slot), agentId: a.id, reason: a.lastStatus === "INSUFFICIENT_FUNDS" ? a.lastStatus : "MARKET_OR_BOUNDARY_UNAVAILABLE" });
                save("round-started");
                if (eligible) {
                  if (integratedDecisions) {
                    await decideRound(market, slot, attemptVersion, state.config.realtimeEntry);
                  } else {
                    await Promise.all(state.agents.map(async (a) => {
                      if (a.lastStatus !== "QUOTING") return;
                      const direction = a.id === "A" ? "UP" : a.id === "B" ? "DOWN" : random() === 0 ? "UP" : "DOWN";
                      try {
                        const book = await readSource("book", market, direction);
                        if (now() - slot > 1e4 || !state.enabled || attemptVersion !== controlVersion || storageFailed || market.markets[0].tradingStatus !== "OPEN") throw error("QUOTE_WINDOW_MISSED");
                        const tokenId = String(market.markets[0].outcomes.find((o) => o.name === (direction === "UP" ? "Up" : "Down")).tokenId);
                        const quote = source.quote ? await readSource("quote", market, direction, STAKE, book) : quoteFromBook(book, tokenId, now());
                        if (now() - slot > 1e4 || !state.enabled || attemptVersion !== controlVersion || storageFailed) throw error("QUOTE_WINDOW_MISSED");
                        a.cash = Math.round((a.cash - STAKE) * 1e8) / 1e8;
                        a.orders.push({
                          id: `${slot}-${a.id}`,
                          topicId: market.marketTopicId,
                          start: slot,
                          end: slot + roundMs,
                          tokenId,
                          direction,
                          amount: STAKE,
                          quote,
                          marketSource: market.marketSource || "binance-prediction",
                          status: "OPEN",
                          placedAt: now()
                        });
                        a.lastStatus = "OPEN";
                      } catch (e) {
                        a.lastStatus = "SKIPPED";
                        a.reason = e.code || "BOOK_UNAVAILABLE";
                      }
                    }));
                    save("legacy-decisions");
                  }
                }
              }
            }
            if (state.recovery) return;
            const entryRound = state.entryRound;
            if (integratedDecisions && state.enabled && state.config.realtimeEntry && entryRound && now() >= entryRound.slot && now() < entryRound.slot + roundMs - ENTRY_CLOSE_BUFFER_MS && now() - lastEntryPoll >= ENTRY_POLL_MS && state.agents.some((a) => a.cash >= minimumStake(a) && !a.orders.some((o) => o.start === entryRound.slot))) {
              lastEntryPoll = now();
              await decideRound(entryRound.market, entryRound.slot, controlVersion, true);
            }
            if (state.recovery) return;
            if (!state.config.realtimeEntry && state.config.maxRounds && state.rounds.length >= state.config.maxRounds) finish("ROUND_LIMIT");
            if (state.enabled && !prepared && now() - lastPrepare >= 15e3 && nextSlot - now() > 15e3) {
              lastPrepare = now();
              const targetSlot = nextSlot, startedAt = now();
              try {
                prepared = await readSource("marketFor", targetSlot, normalizedAsset, roundMs);
                failure = null;
                markChanged("market-prepared");
              } catch (e) {
                failure = e.code || "MARKET_UNAVAILABLE";
                const alreadyRecorded = state.auditTrail.some((event) => event.type === "MARKET_PREP_FAILED" && event.roundId === String(targetSlot) && event.reason === failure);
                if (!alreadyRecorded) {
                  record("MARKET_PREP_FAILED", { roundId: String(targetSlot), reason: failure, latencyMs: Math.max(0, now() - startedAt), asset: normalizedAsset });
                  save("market-prepare-failed");
                } else markChanged("market-prepare-failed");
              }
            }
            if (state.enabled && !hasOpenOrders() && state.agents.every((agent) => agent.cash < (integratedDecisions ? minimumStake(agent) : STAKE))) finish("BALANCE_DEPLETED");
          } catch (e) {
            failure = e.code || "SIMULATION_ERROR";
            if (pauseOnError && !["ended", "settling"].includes(state.lifecycle)) {
              controlVersion++;
              state.enabled = false;
              state.lifecycle = "paused";
              state.endReason = "SIMULATION_ERROR";
              record("PAUSED", { reason: state.endReason, error: failure });
              if (!storageFailed) {
                try {
                  save();
                } catch {
                  failure = "STORAGE_ERROR";
                }
              }
            }
          } finally {
            busy = false;
            finalize();
          }
        }
        return {
          tick,
          marketFailure(code) {
            enterRecovery({ code }, "valuation");
          },
          retryConnection() {
            if (storageFailed) throw error("STORAGE_ERROR");
            if (busy) throw error("BATTLE_BUSY");
            if (!state.recovery) return snapshot();
            state.recovery.attempts = 0;
            state.recovery.status = "retrying";
            state.recovery.nextRetryAt = now();
            record("RECOVERY_REQUESTED");
            save("recovery-requested");
            return snapshot();
          },
          // Paper capital only. TODO(live): wallet funding, receipt reconciliation and explicit authorization;
          // never reuse this virtual credit operation for real balances or real orders.
          topUp(agentId, amount, requestId) {
            if (storageFailed) throw error("STORAGE_ERROR");
            if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 || amount > 1e6 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7) throw error("INVALID_TOP_UP_AMOUNT");
            if (typeof requestId !== "string" || !/^[-a-zA-Z0-9]{8,80}$/.test(requestId)) throw error("INVALID_TOP_UP_REQUEST");
            const prior = state.agents.flatMap((a) => (a.topUps || []).map((entry) => ({ ...entry, agentId: a.id }))).find((entry) => entry.requestId === requestId);
            if (prior) {
              if (prior.agentId !== agentId || prior.amount !== amount) throw error("TOP_UP_CONFLICT");
              return snapshot();
            }
            if (["ended", "settling"].includes(state.lifecycle)) throw error("BATTLE_ENDED");
            if (busy) throw error("BATTLE_BUSY");
            const agent = state.agents.find((a) => a.id === agentId);
            if (!agent) throw error("AGENT_NOT_FOUND");
            if ((agent.addedCapital || 0) + amount > 1e9) throw error("INVALID_TOP_UP_AMOUNT");
            const before = { cash: agent.cash, addedCapital: agent.addedCapital, topUps: agent.topUps }, auditLength = state.auditTrail.length;
            agent.cash = Math.round((agent.cash + amount) * 1e8) / 1e8;
            agent.addedCapital = Math.round(((agent.addedCapital || 0) + amount) * 100) / 100;
            agent.topUps = [...agent.topUps || [], { requestId, amount, at: now() }];
            record("CAPITAL_ADDED", { agentId, amount, requestId, addedCapital: agent.addedCapital });
            try {
              save("capital-added");
            } catch (cause) {
              Object.assign(agent, before);
              state.auditTrail.length = auditLength;
              throw cause;
            }
            return snapshot();
          },
          snapshot,
          liveSnapshot,
          summary,
          touch() {
            if (!["ended", "settling"].includes(state.lifecycle)) touchState();
            return snapshot();
          },
          end(reason = "MANUAL") {
            if (storageFailed) throw error("STORAGE_ERROR");
            finish(reason);
            return snapshot();
          },
          setEmotionLevel(value) {
            if (storageFailed) throw error("STORAGE_ERROR");
            if (["ended", "settling"].includes(state.lifecycle)) throw error("BATTLE_ENDED");
            const emotionLevel2 = normalizeBattleEmotion(value);
            if (state.config.emotionLevel === emotionLevel2) return snapshot();
            controlVersion++;
            state.config.emotionLevel = emotionLevel2;
            state.config.controlsRevision = (state.config.controlsRevision || 0) + 1;
            record("EMOTION_CHANGED", { emotionLevel: emotionLevel2 });
            touchState();
            save();
            return snapshot();
          },
          setActionUrgeLevel(value) {
            if (storageFailed) throw error("STORAGE_ERROR");
            if (["ended", "settling"].includes(state.lifecycle)) throw error("BATTLE_ENDED");
            const actionUrgeLevel2 = normalizeBattleActionUrge(value);
            if (state.config.actionUrgeLevel === actionUrgeLevel2) return snapshot();
            controlVersion++;
            state.config.actionUrgeLevel = actionUrgeLevel2;
            state.config.controlsRevision = (state.config.controlsRevision || 0) + 1;
            record("ACTION_URGE_CHANGED", { actionUrgeLevel: actionUrgeLevel2 });
            touchState();
            save();
            return snapshot();
          },
          setRealtimeEntry(value) {
            if (storageFailed) throw error("STORAGE_ERROR");
            if (["ended", "settling"].includes(state.lifecycle)) throw error("BATTLE_ENDED");
            const enabled2 = normalizeRealtimeEntry(value);
            if (enabled2 && !integratedDecisions) throw error("REALTIME_ENTRY_UNAVAILABLE");
            if (state.config.realtimeEntry === enabled2) return snapshot();
            controlVersion++;
            state.config.realtimeEntry = enabled2;
            record("REALTIME_ENTRY_CHANGED", { enabled: enabled2 });
            touchState();
            save();
            return snapshot();
          },
          pauseForAiOutage(details) {
            if (!state.enabled || ["ended", "settling"].includes(state.lifecycle)) return;
            controlVersion++;
            state.enabled = false;
            state.lifecycle = "paused";
            state.endReason = "AI_CONNECTION_OUTAGE";
            state.aiConnectionFailure = structuredClone(details);
            for (const agent of state.agents) if (agent.lastStatus === "QUOTING") agent.lastStatus = "PAUSED";
            record("PAUSED", { reason: state.endReason, details });
            save("ai-connection-outage");
          },
          setEnabled(value) {
            if (storageFailed) throw error("STORAGE_ERROR");
            if (["ended", "settling"].includes(state.lifecycle)) {
              if (value) throw error("BATTLE_ENDED");
              return snapshot();
            }
            controlVersion++;
            state.enabled = Boolean(value);
            state.lifecycle = state.enabled ? "running" : "paused";
            state.endReason = state.enabled ? null : state.endReason === "CLIENT_DISCONNECTED" ? state.endReason : "USER_PAUSED";
            if (state.enabled) state.aiConnectionFailure = null;
            touchState();
            save();
            return snapshot();
          }
        };
      }
      module.exports = { PERIODS, ROUND, normalizePeriod, nextRoundSlot, isRoundBoundary, validateMarket, quoteFromBook, decisionDiversity, createPredictionSource, createPredictionSimulation };
    }
  });

  // ai-connections.js
  var require_ai_connections = __commonJS({
    "ai-connections.js"(exports, module) {
      var fs = require_fs();
      var path = require_path();
      var crypto = require_crypto2();
      var { atomicWriteJson } = require_atomic_json();
      var { profiles } = require_strategy_catalog();
      var { assertDecisionInputs, decisionPrompt, createMockDecisionProvider, DECISION_META } = require_ai_decision();
      var { aiFetch } = require_http();
      var RETRY_DELAYS = [500, 1e3];
      var RETRYABLE = /* @__PURE__ */ new Set(["AI_REQUEST_FAILED", "AI_REQUEST_TIMEOUT", "AI_RATE_LIMITED", "AI_UPSTREAM_UNAVAILABLE"]);
      var CONNECTION_FAILURES = /* @__PURE__ */ new Set([...RETRYABLE, "AI_AUTH_FAILED", "AI_CONNECTION_NOT_TESTED"]);
      var fail = (code, statusCode = 422) => Object.assign(new Error(code), { code, statusCode });
      var providers = /* @__PURE__ */ new Set(["openai", "anthropic", "deepseek", "custom"]);
      var token = (n) => Number.isSafeInteger(n) && n >= 0 ? n : null;
      function usageOf(payload, provider) {
        const u = payload?.usage;
        if (!u) return null;
        const output = token(provider === "anthropic" ? u.output_tokens : u.completion_tokens);
        let input = token(provider === "anthropic" ? u.input_tokens : u.prompt_tokens);
        const cached = token(provider === "anthropic" ? u.cache_read_input_tokens ?? 0 : u.prompt_cache_hit_tokens ?? u.prompt_tokens_details?.cached_tokens ?? 0);
        const cacheWrite = token(provider === "anthropic" ? u.cache_creation_input_tokens ?? 0 : 0);
        if ([input, output, cached, cacheWrite].includes(null)) return null;
        if (provider === "anthropic") input += cached + cacheWrite;
        if (cached + cacheWrite > input) return null;
        return { input, output, cached, cacheWrite, total: input + output };
      }
      function createAiConnections({ file, fetchImpl = aiFetch, now = Date.now, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), fallback = createMockDecisionProvider(), secretCodec } = {}) {
        let state = file && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { version: 1, connections: {}, assignments: {}, usage: {}, recent: [] };
        if (state.version !== 1 || !state.connections || !state.assignments || !state.usage || !Array.isArray(state.recent)) throw fail("AI_STORE_INVALID", 503);
        let memoryKey, broken = false;
        const busy = /* @__PURE__ */ new Set();
        function key() {
          if (memoryKey) return memoryKey;
          if (!file) return memoryKey = crypto.randomBytes(32);
          const target = `${file}.key`;
          if (fs.existsSync(target)) {
            memoryKey = fs.readFileSync(target);
            if (memoryKey.length !== 32) throw fail("AI_VAULT_UNAVAILABLE", 503);
            return memoryKey;
          }
          if (Object.keys(state.connections).length) throw fail("AI_VAULT_UNAVAILABLE", 503);
          fs.mkdirSync(path.dirname(file), { recursive: true });
          memoryKey = crypto.randomBytes(32);
          fs.writeFileSync(target, memoryKey, { mode: 384, flag: "wx" });
          return memoryKey;
        }
        function seal(secret) {
          if (secretCodec) return secretCodec.seal(secret);
          const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
          const bytes = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
          return { iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: bytes.toString("base64") };
        }
        function unseal(secret) {
          if (secretCodec) return secretCodec.unseal(secret);
          try {
            const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(secret.iv, "base64"));
            decipher.setAuthTag(Buffer.from(secret.tag, "base64"));
            return Buffer.concat([decipher.update(Buffer.from(secret.data, "base64")), decipher.final()]).toString("utf8");
          } catch {
            throw fail("AI_VAULT_UNAVAILABLE", 503);
          }
        }
        function commit(next) {
          if (broken) throw fail("AI_STORAGE_FAILED", 503);
          try {
            if (file) atomicWriteJson(file, next);
            state = next;
          } catch {
            broken = true;
            throw fail("AI_STORAGE_FAILED", 503);
          }
        }
        function candidate(body) {
          if (!body || !providers.has(body.provider)) throw fail("AI_PROVIDER_INVALID");
          const id = body.provider, old = state.connections[id];
          let url;
          try {
            url = new URL(body.baseUrl);
          } catch {
            throw fail("AI_URL_INVALID");
          }
          if (url.username || url.password || url.search || url.hash || !["http:", "https:"].includes(url.protocol) || url.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw fail("AI_URL_INVALID");
          const model = typeof body.model === "string" ? body.model.trim() : "";
          if (!model || model.length > 160 || /[\x00-\x1f]/.test(model)) throw fail("AI_MODEL_INVALID");
          const baseUrl = url.href.replace(/\/+$/, "");
          const raw = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
          if (raw.length > 4096) throw fail("AI_KEY_INVALID");
          if (!raw && (!old || old.baseUrl !== baseUrl)) throw fail("AI_KEY_REQUIRED");
          const same = old && old.baseUrl === baseUrl && old.model === model && (!raw || raw === unseal(old.secret));
          return {
            id,
            provider: body.provider,
            baseUrl,
            model,
            secret: raw ? seal(raw) : old.secret,
            revision: same ? old.revision : crypto.randomUUID(),
            testedAt: same ? old.testedAt : null,
            updatedAt: now(),
            lastError: same ? old.lastError : null
          };
        }
        const engine = (c) => ({ mode: c.provider, provider: c.provider, model: c.model, connectionId: c.id, configured: Boolean(c.testedAt), simulated: false });
        const connectionFor = (input) => input.policy.ai_connection_id ?? state.assignments[input.policy.strategy];
        function describeFor(input) {
          const id = connectionFor(input);
          if (id === "none") return createMockDecisionProvider().describe();
          if (id === void 0) return fallback.describe();
          const c = state.connections[id];
          return c ? engine(c) : { mode: "unavailable", connectionId: id, configured: false, simulated: false };
        }
        function snapshot() {
          return structuredClone({
            connections: Object.values(state.connections).map(({ secret, ...c }) => ({ ...c, tested: Boolean(c.testedAt) })),
            assignments: state.assignments,
            usage: state.usage,
            recent: state.recent.slice(-30).reverse(),
            storageFailed: broken,
            defaultEngine: fallback.describe()
          });
        }
        function accountCall(c, strategy, kind, startedAt, payload, error) {
          const usage = usageOf(payload, c.provider);
          const next = structuredClone(state);
          const aggregate = next.usage[c.id] ||= { calls: 0, errors: 0, tests: 0, input: 0, output: 0, cached: 0, total: 0, missingUsageCalls: 0 };
          aggregate.calls++;
          aggregate.errors += Boolean(error);
          aggregate.tests += kind === "test";
          if (usage) for (const k of ["input", "output", "cached", "total"]) aggregate[k] += usage[k];
          else aggregate.missingUsageCalls++;
          const event = {
            id: crypto.randomUUID(),
            connectionId: c.id,
            model: c.model,
            strategy,
            kind,
            at: now(),
            durationMs: now() - startedAt,
            usage,
            error: error || null
          };
          aggregate.last = event;
          next.recent = [...next.recent, event].slice(-200);
          if (next.connections[c.id]?.revision === c.revision) {
            next.connections[c.id].lastError = error || null;
            next.connections[c.id].lastCheckedAt = now();
          }
          commit(next);
          return event;
        }
        async function invoke(c, prompt, input, options = {}, kind = "decision") {
          if (broken) throw fail("AI_STORAGE_FAILED", 503);
          const started = now(), budget = Math.floor(Math.min(kind === "test" ? 15e3 : 8e3, (options.deadlineMs ?? Infinity) - (options.now || now)() - 250));
          if (budget <= 0 || options.isCancelled?.()) throw Object.assign(fail("AI_DEADLINE_EXPIRED"), { requestStarted: false });
          const secret = unseal(c.secret);
          const isClaude = c.provider === "anthropic", isOpenai = c.provider === "openai";
          const body = isClaude ? { model: c.model, max_tokens: 1500, system: prompt, messages: [{ role: "user", content: JSON.stringify(input) }] } : {
            model: c.model,
            messages: [{ role: "system", content: prompt }, { role: "user", content: JSON.stringify(input) }],
            response_format: { type: "json_object" },
            ...isOpenai ? { max_completion_tokens: 4096 } : { max_tokens: 1500 },
            ...c.provider === "deepseek" ? { thinking: { type: "disabled" } } : {}
          };
          let payload, raw, failure;
          if (kind === "decision") options.onRequest?.({ provider: c.provider, body: structuredClone(body), responseContract: "strategy-v2" });
          try {
            const response = await fetchImpl(`${c.baseUrl}/${isClaude ? "messages" : "chat/completions"}`, {
              method: "POST",
              redirect: "error",
              signal: AbortSignal.timeout(budget),
              headers: isClaude ? { "content-type": "application/json", "x-api-key": secret, "anthropic-version": "2023-06-01" } : { "content-type": "application/json", authorization: `Bearer ${secret}` },
              body: JSON.stringify(body)
            });
            if (!response.ok) throw fail(response.status === 401 || response.status === 403 ? "AI_AUTH_FAILED" : response.status === 429 ? "AI_RATE_LIMITED" : response.status >= 500 ? "AI_UPSTREAM_UNAVAILABLE" : "AI_REQUEST_REJECTED", 503);
            payload = await response.json();
            if (payload.stop_reason === "max_tokens" || payload.choices?.[0]?.finish_reason === "length") throw fail("AI_RESPONSE_TRUNCATED");
            const content = isClaude ? payload.content?.filter((v) => v.type === "text").map((v) => v.text).join("") : payload.choices?.[0]?.message?.content;
            if (typeof content !== "string") throw fail("AI_RESPONSE_INVALID");
            try {
              raw = JSON.parse(content);
            } catch {
              throw fail("AI_RESPONSE_INVALID");
            }
            if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw fail("AI_RESPONSE_INVALID");
            if (kind === "test" && (raw.round_id !== input.market.round_id || raw.action !== "SKIP" || raw.direction !== null || raw.stake_usdt !== 0 || raw.stake_pct !== 0 || raw.risk_mode !== "WAIT" || raw.data_fresh !== true || !Number.isFinite(raw.confidence) || raw.confidence < 0 || raw.confidence > 100 || typeof raw.reason !== "string" || !Array.isArray(raw.factors) || !Array.isArray(raw.warnings))) throw fail("AI_TEST_DECISION_INVALID");
          } catch (e) {
            failure = e.code?.startsWith?.("AI_") ? e : fail(e.name === "TimeoutError" || e.name === "AbortError" ? "AI_REQUEST_TIMEOUT" : "AI_REQUEST_FAILED", 503);
          }
          const event = accountCall(c, input.policy?.strategy || null, kind, started, payload, failure?.code);
          if (failure) throw failure;
          Object.defineProperty(raw, DECISION_META, { value: { engine: engine(c), usage: event, ...kind === "decision" ? { responseContract: "strategy-v2" } : {} } });
          return raw;
        }
        async function testConnection(id, revision) {
          const c = state.connections[id];
          if (!c || revision && revision !== c.revision) throw fail("AI_CONFIGURATION_CHANGED", 409);
          if (busy.has(id)) throw fail("AI_CONNECTION_BUSY", 409);
          busy.add(id);
          try {
            const input = { market: { round_id: "connection-test" }, policy: { strategy: "connection-test" } };
            await invoke(c, 'Connection test only. Return exactly this JSON object: {"round_id":"connection-test","action":"SKIP","direction":null,"stake_usdt":0,"stake_pct":0,"confidence":0,"risk_mode":"WAIT","factors":[],"reason":"connection test","data_fresh":true,"warnings":[]}', input, {}, "test");
            commit({ ...state, connections: { ...state.connections, [id]: { ...state.connections[id], testedAt: now(), lastError: null } } });
            return snapshot();
          } catch (error) {
            if (!broken) commit({ ...state, connections: { ...state.connections, [id]: { ...state.connections[id], lastError: error.code } } });
            throw error;
          } finally {
            busy.delete(id);
          }
        }
        async function save(body, test = false) {
          if (busy.has(body?.provider)) throw fail("AI_CONNECTION_BUSY", 409);
          const c = candidate(body);
          busy.add(c.id);
          try {
            if (test) c.testedAt = null;
            commit({ ...state, connections: { ...state.connections, [c.id]: c } });
            if (test) {
              const input = { market: { round_id: "connection-test" }, policy: { strategy: "connection-test" } };
              try {
                await invoke(c, 'This is a paper decision connection test, not a trade. Return only this JSON object: {"round_id":"connection-test","action":"SKIP","direction":null,"stake_usdt":0,"stake_pct":0,"confidence":0,"risk_mode":"WAIT","factors":[],"reason":"connection test","data_fresh":true,"warnings":[]}', input, {}, "test");
                c.testedAt = now();
                c.lastError = null;
              } catch (e) {
                c.lastError = e.code;
                throw e;
              } finally {
                commit({ ...state, connections: { ...state.connections, [c.id]: c } });
              }
            }
            return snapshot();
          } finally {
            busy.delete(c.id);
          }
        }
        function assign(strategy, connectionId) {
          if (!Object.hasOwn(profiles, strategy)) throw fail("AI_STRATEGY_INVALID");
          if (connectionId !== "none" && !state.connections[connectionId]?.testedAt) throw fail("AI_CONNECTION_NOT_TESTED", 409);
          commit({
            ...state,
            assignments: { ...state.assignments, [strategy]: connectionId },
            assignmentVersions: { ...state.assignmentVersions, [strategy]: crypto.randomUUID() }
          });
          return snapshot();
        }
        function remove(id) {
          if (!providers.has(id)) throw fail("AI_PROVIDER_INVALID");
          if (busy.has(id)) throw fail("AI_CONNECTION_BUSY", 409);
          const next = structuredClone(state);
          delete next.connections[id];
          commit(next);
          return snapshot();
        }
        const router = {
          describe: () => Object.values(state.assignments).some((id) => id !== "none") ? { mode: "routed", provider: "Strategy assignments", configured: true, simulated: false } : fallback.describe(),
          describeFor,
          async decide(input, options = {}) {
            const id = connectionFor(input);
            if (id === void 0) return fallback.decide(input, options);
            if (id === "none") return createMockDecisionProvider().decide(input, options);
            const c = state.connections[id];
            const version = state.assignmentVersions?.[input.policy.strategy];
            if (!c?.testedAt) throw fail("AI_CONNECTION_NOT_TESTED", 503);
            if (input.policy.ai_connection_revision && input.policy.ai_connection_revision !== c.revision) throw fail("AI_CONFIGURATION_CHANGED");
            assertDecisionInputs(input);
            const cancelled = () => options.isCancelled?.() || input.policy.ai_connection_id === void 0 && state.assignmentVersions?.[input.policy.strategy] !== version || connectionFor(input) !== id || state.connections[id]?.revision !== c.revision || !state.connections[id]?.testedAt;
            const clock = options.now || now;
            const deadlineMs = Math.min(options.deadlineMs ?? Infinity, input.market.data_timestamp + 1e4);
            for (let attempt = 0; ; attempt++) {
              if (cancelled()) throw fail("AI_CONFIGURATION_CHANGED");
              try {
                const raw = await invoke(c, decisionPrompt(input), input, { ...options, deadlineMs, isCancelled: cancelled });
                if (cancelled()) throw fail("AI_CONFIGURATION_CHANGED");
                return raw;
              } catch (error) {
                if (CONNECTION_FAILURES.has(error.code)) options.onConnectionFailure?.(error);
                if (!RETRYABLE.has(error.code) || attempt >= RETRY_DELAYS.length || cancelled() || clock() + RETRY_DELAYS[attempt] + 500 >= deadlineMs) throw error;
                await wait(RETRY_DELAYS[attempt]);
              }
            }
          }
        };
        function assertAgents(agents = []) {
          if (!Array.isArray(agents)) throw fail("INVALID_BATTLE_AGENTS");
          for (const a of agents) {
            if (a.aiConnectionId === void 0 || a.aiConnectionId === "none") continue;
            const c = state.connections[a.aiConnectionId];
            if (!c?.testedAt) throw fail("AI_CONNECTION_NOT_TESTED", 409);
            if (a.aiConnectionRevision !== c.revision) throw fail("AI_CONFIGURATION_CHANGED", 409);
          }
        }
        return { snapshot, save, testConnection, assign, remove, router, assertAgents };
      }
      module.exports = { createAiConnections, usageOf, CONNECTION_FAILURES };
    }
  });

  // simulation-battles.js
  var require_simulation_battles = __commonJS({
    "simulation-battles.js"(exports, module) {
      var fs = require_fs();
      var path = require_path();
      var crypto = require_crypto2();
      var creationRequest = require_creation_request();
      var { atomicWriteJson } = require_atomic_json();
      var { PERIODS, createPredictionSimulation } = require_prediction_sim();
      var { normalizeAgentPolicies, normalizePolicy } = require_ai_decision();
      var { supportsAsset } = require_strategy_catalog();
      var MAX_AGENTS = 8;
      var MAX_AI_DECISION_CONCURRENCY = 4;
      var MAX_ROUNDS = 1e3;
      var DEFAULT_AGENT_IDS = ["A", "B", "C"];
      function asMoney(value, fallback = 100) {
        const number = Number(value);
        return Number.isFinite(number) ? Math.max(0.01, Math.min(1e5, Math.round(number * 100) / 100)) : fallback;
      }
      function limitExternalDecisionProvider(provider, limit = MAX_AI_DECISION_CONCURRENCY) {
        const mode = provider?.describe?.()?.mode;
        if (!provider?.decide) return provider;
        let active = 0;
        const queue = [];
        const pump = () => {
          while (active < limit && queue.length) {
            const job = queue.shift();
            active++;
            Promise.resolve().then(() => {
              if (job.options?.isCancelled?.() || job.options?.deadlineMs != null && (job.options.now || Date.now)() >= job.options.deadlineMs) throw Object.assign(new Error("AI_DEADLINE_EXPIRED"), { code: "AI_DEADLINE_EXPIRED", requestStarted: false });
              return provider.decide(job.input, job.options);
            }).then(job.resolve, job.reject).finally(() => {
              active--;
              pump();
            });
          }
        };
        return {
          describe: () => {
            const info = provider.describe();
            return ["mock", "off", "offline", "legacy"].includes(info.mode) ? info : { ...info, maxConcurrentRequests: limit };
          },
          describeFor: (input) => provider.describeFor?.(input) || provider.describe(),
          decide: (input, options) => {
            const current = provider.describeFor?.(input) || provider.describe();
            if (["mock", "off", "offline", "legacy"].includes(current.mode)) return provider.decide(input, options);
            return new Promise((resolve, reject) => {
              queue.push({ input, options, resolve, reject });
              pump();
            });
          }
        };
      }
      function normalizeBattleConfig(value = {}, currentPolicies = normalizeAgentPolicies()) {
        const rawAgents = Array.isArray(value.agents) && value.agents.length ? value.agents : DEFAULT_AGENT_IDS.map((id) => currentPolicies[id]);
        if (Object.hasOwn(value, "agents") && (!Array.isArray(value.agents) || !value.agents.length || value.agents.length > MAX_AGENTS)) throw Object.assign(new Error("INVALID_BATTLE_AGENTS"), { statusCode: 400 });
        const amount = value.initialBalance ?? value.budget;
        if (amount !== void 0 && (typeof amount !== "number" || !Number.isFinite(amount) || amount < 1 || amount > 1e3)) throw Object.assign(new Error("INVALID_BATTLE_BUDGET"), { statusCode: 400 });
        if (new Set(rawAgents.map((agent) => agent?.coin || "BTC")).size > 1) throw Object.assign(new Error("MIXED_BATTLE_ASSETS"), { statusCode: 400 });
        const seen = /* @__PURE__ */ new Set();
        const agents = rawAgents.slice(0, MAX_AGENTS).map((agent, index) => {
          let id = String(agent?.id || DEFAULT_AGENT_IDS[index] || `agent-${index + 1}`).trim().slice(0, 60);
          if (!id || seen.has(id)) id = `agent-${index + 1}`;
          while (seen.has(id)) id = `${id}-${index + 1}`;
          seen.add(id);
          const normalized = normalizePolicy({ ...agent, id }, id);
          if (!supportsAsset(normalized.strategy, normalized.coin)) throw Object.assign(new Error("CHARACTER_ASSET_UNSUPPORTED"), { code: "CHARACTER_ASSET_UNSUPPORTED", statusCode: 400 });
          return {
            ...normalized,
            id,
            name: String(agent?.name || normalized.name).trim().slice(0, 18) || `AI ${index + 1}`,
            coin: ["BTC", "ETH", "BNB"].includes(agent?.coin) ? agent.coin : "BTC"
          };
        });
        const configuredRounds = value.rounds ?? value.maxRounds;
        if (configuredRounds != null && configuredRounds !== "until-loss" && configuredRounds !== "" && (!Number.isInteger(configuredRounds) || configuredRounds < 1 || configuredRounds > MAX_ROUNDS)) throw Object.assign(new Error("INVALID_BATTLE_ROUNDS"), { statusCode: 400 });
        const rounds = configuredRounds === "until-loss" || configuredRounds == null || configuredRounds === "" ? null : Math.max(1, Math.min(MAX_ROUNDS, Math.floor(Number(configuredRounds)) || 1));
        const emotionLevel = value.emotionLevel ?? 0;
        if (typeof emotionLevel !== "number" || !Number.isInteger(emotionLevel) || emotionLevel < 0 || emotionLevel > 100) throw Object.assign(new Error("INVALID_BATTLE_EMOTION"), { statusCode: 400, code: "INVALID_BATTLE_EMOTION" });
        const actionUrgeLevel = value.actionUrgeLevel ?? 0;
        if (typeof actionUrgeLevel !== "number" || !Number.isInteger(actionUrgeLevel) || actionUrgeLevel < 0 || actionUrgeLevel > 100) throw Object.assign(new Error("INVALID_BATTLE_ACTION_URGE"), { statusCode: 400, code: "INVALID_BATTLE_ACTION_URGE" });
        const realtimeEntry = value.realtimeEntry ?? false;
        if (typeof realtimeEntry !== "boolean") throw Object.assign(new Error("INVALID_REALTIME_ENTRY"), { statusCode: 400, code: "INVALID_REALTIME_ENTRY" });
        const period = String(value.period || "5m").toLowerCase();
        if (!Object.hasOwn(PERIODS, period)) throw Object.assign(new Error("INVALID_BATTLE_PERIOD"), { statusCode: 400, code: "INVALID_BATTLE_PERIOD" });
        return {
          initialBalance: asMoney(value.initialBalance ?? value.budget, 100),
          rounds,
          market: "Binance Prediction",
          asset: `${agents[0].coin}USDT`,
          period,
          roundMs: PERIODS[period],
          emotionLevel,
          actionUrgeLevel,
          realtimeEntry,
          agents
        };
      }
      function createSimulationBattles({ source, indicatorSource, decisionProvider, file, now = Date.now, leaseEnabled = true, pauseOnRestore = false, pauseOnError = false }) {
        const { CONNECTION_FAILURES } = require_ai_connections();
        const observations = /* @__PURE__ */ new Map();
        let outage = null;
        function observe(input, options, cause) {
          if (outage || options.isCancelled?.()) return;
          for (const [key2, value] of observations) if (now() - value.at > 6e4) observations.delete(key2);
          const key = JSON.stringify([options.battleId, input.policy.agent_id, input.market.round_id, input.market.data_timestamp]);
          observations.set(key, { at: now(), failed: Boolean(cause) });
          const failures = [...observations.values()].filter((value) => value.failed).length;
          if (!cause || failures < 3 || failures / observations.size < 0.6) return;
          outage = { id: crypto.randomUUID(), at: now(), code: cause.code, failures, reviews: observations.size };
          for (const sim of simulations.values()) {
            try {
              sim.pauseForAiOutage(outage);
            } catch {
            }
          }
          emitChange({ battleId: "*", reason: "ai-connection-outage", aiConnectionFailure: outage });
        }
        const supervisedProvider = decisionProvider?.decide ? {
          describe: () => decisionProvider.describe(),
          describeFor: (input) => decisionProvider.describeFor?.(input) || decisionProvider.describe(),
          async decide(input, options = {}) {
            const info = this.describeFor(input);
            if (["mock", "off", "offline", "legacy"].includes(info.mode)) return decisionProvider.decide(input, options);
            try {
              const raw = await decisionProvider.decide(input, { ...options, onConnectionFailure: (cause) => observe(input, options, cause) });
              observe(input, options, null);
              return raw;
            } catch (cause) {
              if (CONNECTION_FAILURES.has(cause.code)) observe(input, options, cause);
              throw cause;
            }
          }
        } : decisionProvider;
        const sharedDecisionProvider = limitExternalDecisionProvider(supervisedProvider);
        const registryFile = file && path.join(path.dirname(file), "simulation-battles.json");
        const strategyFile = file && path.join(path.dirname(file), "simulation-strategies.json");
        let policies = normalizeAgentPolicies();
        if (strategyFile && fs.existsSync(strategyFile)) {
          const saved = JSON.parse(fs.readFileSync(strategyFile, "utf8"));
          if (saved.version !== 1) throw new Error("INVALID_SIMULATION_STRATEGIES");
          policies = normalizeAgentPolicies(saved.agents);
        }
        let records = [{ id: "default", name: "A / B / C", createdAt: null, config: normalizeBattleConfig({}, policies) }];
        let creationRequests = {};
        if (registryFile && fs.existsSync(registryFile)) {
          const data = JSON.parse(fs.readFileSync(registryFile, "utf8"));
          if (data.version !== 1 || !Array.isArray(data.battles) || data.battles[0]?.id !== "default" || new Set(data.battles.map((b) => b.id)).size !== data.battles.length || data.battles.some((b) => !/^(default|[a-f0-9-]{36})$/.test(b.id) || typeof b.name !== "string")) throw new Error("INVALID_BATTLE_REGISTRY");
          records = data.battles.map((record) => ({ ...record, config: normalizeBattleConfig(record.config, policies) }));
          creationRequests = data.creationRequests || {};
        }
        const pending = /* @__PURE__ */ new Map();
        const listeners = /* @__PURE__ */ new Set();
        function emitChange(change) {
          const event = { type: "simulation", observedAt: now(), ...change };
          for (const listener of listeners) {
            try {
              listener(event);
            } catch {
            }
          }
        }
        const shared = Object.fromEntries(["marketFor", "detail", "book"].map((method) => [method, (...args) => {
          const key = JSON.stringify([method, args]);
          if (!pending.has(key)) pending.set(key, Promise.resolve().then(() => source[method](...args)).finally(() => pending.delete(key)));
          return pending.get(key);
        }]));
        for (const method of ["quote", "refreshMarket", "describe"]) {
          if (typeof source[method] === "function") shared[method] = (...args) => source[method](...args);
        }
        const ledgerFile = (id) => !file ? void 0 : id === "default" ? file : path.join(path.dirname(file), `battle-${id}.json`);
        if (file && records.some((b) => b.id !== "default" && !fs.existsSync(ledgerFile(b.id)))) throw new Error("BATTLE_LEDGER_MISSING");
        const makeSimulation = (record) => {
          const config = normalizeBattleConfig(record.config, policies);
          const policyMap = new Map(config.agents.map((agent) => [agent.id, agent]));
          const battleProvider = sharedDecisionProvider && {
            ...sharedDecisionProvider,
            decide: (input, options) => sharedDecisionProvider.decide(input, { ...options, battleId: record.id })
          };
          return createPredictionSimulation({
            source: shared,
            indicatorSource,
            decisionProvider: battleProvider,
            policyFor: (id) => policyMap.get(id),
            agentPolicies: config.agents,
            initialBalance: config.initialBalance,
            maxRounds: config.rounds,
            asset: config.asset,
            period: config.period,
            emotionLevel: config.emotionLevel,
            actionUrgeLevel: config.actionUrgeLevel,
            realtimeEntry: config.realtimeEntry,
            file: ledgerFile(record.id),
            now,
            leaseEnabled,
            pauseOnRestore,
            pauseOnError,
            enabled: record.id !== "default" || !leaseEnabled && !pauseOnRestore,
            onChange: (change) => emitChange({ battleId: record.id, ...change })
          });
        };
        const simulations = new Map(records.map((record) => [record.id, makeSimulation(record)]));
        let resetting = false;
        const activeTicks = /* @__PURE__ */ new Map();
        function assertReady() {
          if (resetting) throw Object.assign(new Error("RESET_IN_PROGRESS"), { statusCode: 409 });
        }
        function get(id = "default") {
          const sim = simulations.get(id);
          if (!sim) throw Object.assign(new Error("Battle not found"), { statusCode: 404, code: "BATTLE_NOT_FOUND" });
          return sim;
        }
        function snapshot(id = "default") {
          const record = records.find((battle) => battle.id === id);
          return { ...get(id).snapshot(), id: record.id, name: record.name, createdAt: record.createdAt, placeholder: Boolean(record.placeholder) };
        }
        function liveSnapshot(id = "default") {
          const record = records.find((battle) => battle.id === id);
          return { ...get(id).liveSnapshot(), id: record.id, name: record.name, createdAt: record.createdAt, placeholder: Boolean(record.placeholder), view: "live" };
        }
        function summary(id = "default") {
          const record = records.find((battle) => battle.id === id);
          return { ...get(id).summary(), id: record.id, name: record.name, createdAt: record.createdAt, placeholder: Boolean(record.placeholder), view: "summary" };
        }
        function list() {
          return records.map((record) => snapshot(record.id));
        }
        function summaries() {
          return records.map((record) => summary(record.id));
        }
        function findCreation(requestId, name, config = {}) {
          assertReady();
          const { prior } = creationRequest.lookup(creationRequests, requestId, name, config);
          if (!prior) return null;
          if (!simulations.has(prior.battleId) || records.find((record) => record.id === prior.battleId)?.placeholder) throw creationRequest.fail("BATTLE_CREATION_RETIRED");
          return snapshot(prior.battleId);
        }
        function create(name, config = {}, clientId = null, requestId = null) {
          assertReady();
          const prior = findCreation(requestId, name, config);
          if (prior) return prior;
          if (typeof (config.initialBalance ?? config.budget) === "number" && (config.initialBalance ?? config.budget) < 10) throw Object.assign(new Error("INVALID_BATTLE_BUDGET"), { code: "INVALID_BATTLE_BUDGET", statusCode: 400 });
          if (typeof name !== "string" || !name.trim() || name.trim().length > 40) throw Object.assign(new Error("Name must contain 1\u201340 characters"), { statusCode: 400 });
          const record = { id: crypto.randomUUID(), name: name.trim(), createdAt: now(), config: normalizeBattleConfig(config, policies), ownerClientId: clientId || null };
          if (record.config.initialBalance < 10) throw Object.assign(new Error("INVALID_BATTLE_BUDGET"), { code: "INVALID_BATTLE_BUDGET", statusCode: 400 });
          const sim = makeSimulation(record);
          sim.setEnabled(true);
          const next = [...records, record];
          const nextRequests = requestId ? { ...creationRequests, [requestId]: { battleId: record.id, signature: creationRequest.signature(requestId, name, config) } } : creationRequests;
          if (registryFile) {
            atomicWriteJson(registryFile, { version: 1, battles: next, creationRequests: nextRequests });
          }
          records = next;
          creationRequests = nextRequests;
          simulations.set(record.id, sim);
          outage = null;
          observations.clear();
          return snapshot(record.id);
        }
        function leaderboard(battles = summaries()) {
          return battles.filter((battle) => !battle.placeholder).flatMap((battle) => battle.agents.map((agent) => ({
            battleId: battle.id,
            battleName: battle.name,
            agentId: agent.id,
            equity: agent.equity,
            profit: agent.equity - battle.config.initialBalance - (agent.addedCapital || 0),
            returnRate: (agent.equity - battle.config.initialBalance - (agent.addedCapital || 0)) / (battle.config.initialBalance + (agent.addedCapital || 0)),
            wins: agent.wins,
            losses: agent.losses,
            winRate: agent.winRate
          }))).sort((a, b) => b.profit - a.profit || (b.winRate ?? -1) - (a.winRate ?? -1) || a.battleId.localeCompare(b.battleId) || a.agentId.localeCompare(b.agentId));
        }
        function getStrategies() {
          return structuredClone({ agents: DEFAULT_AGENT_IDS.map((id) => policies[id]) });
        }
        function setStrategies(value) {
          policies = normalizeAgentPolicies(value);
          if (strategyFile) {
            fs.mkdirSync(path.dirname(strategyFile), { recursive: true });
            fs.writeFileSync(`${strategyFile}.tmp`, JSON.stringify({ version: 1, agents: DEFAULT_AGENT_IDS.map((id) => policies[id]) }), { mode: 384 });
            fs.renameSync(`${strategyFile}.tmp`, strategyFile);
          }
          return getStrategies();
        }
        function touch(id = "default") {
          assertReady();
          return get(id).touch();
        }
        function topUp(id, agentId, amount, requestId) {
          assertReady();
          if (records.find((record) => record.id === id)?.placeholder) throw Object.assign(new Error("CREATE_BATTLE_FIRST"), { code: "CREATE_BATTLE_FIRST" });
          get(id).topUp(agentId, amount, requestId);
          return snapshot(id);
        }
        function setEnabled(value, id = "default") {
          assertReady();
          if (value && records.find((r) => r.id === id)?.placeholder) throw Object.assign(new Error("CREATE_BATTLE_FIRST"), { statusCode: 409 });
          get(id).setEnabled(value);
          if (value) {
            outage = null;
            observations.clear();
          }
          return snapshot(id);
        }
        function setEmotion(value, id = "default") {
          assertReady();
          if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) throw Object.assign(new Error("INVALID_BATTLE_EMOTION"), { statusCode: 400, code: "INVALID_BATTLE_EMOTION" });
          const record = records.find((item) => item.id === id);
          if (record?.placeholder) throw Object.assign(new Error("CREATE_BATTLE_FIRST"), { statusCode: 409, code: "CREATE_BATTLE_FIRST" });
          const sim = get(id), current = sim.snapshot();
          if (["ended", "settling"].includes(current.status)) throw Object.assign(new Error("BATTLE_ENDED"), { statusCode: 409, code: "BATTLE_ENDED" });
          sim.setEmotionLevel(value);
          return snapshot(id);
        }
        function setActionUrge(value, id = "default") {
          assertReady();
          if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) throw Object.assign(new Error("INVALID_BATTLE_ACTION_URGE"), { statusCode: 400, code: "INVALID_BATTLE_ACTION_URGE" });
          const record = records.find((item) => item.id === id);
          if (record?.placeholder) throw Object.assign(new Error("CREATE_BATTLE_FIRST"), { statusCode: 409, code: "CREATE_BATTLE_FIRST" });
          const sim = get(id), current = sim.snapshot();
          if (["ended", "settling"].includes(current.status)) throw Object.assign(new Error("BATTLE_ENDED"), { statusCode: 409, code: "BATTLE_ENDED" });
          sim.setActionUrgeLevel(value);
          return snapshot(id);
        }
        function end(id = "default", reason = "MANUAL") {
          assertReady();
          get(id).end(reason);
          return snapshot(id);
        }
        function setRealtimeEntry(value, id = "default") {
          assertReady();
          if (typeof value !== "boolean") throw Object.assign(new Error("INVALID_REALTIME_ENTRY"), { statusCode: 400, code: "INVALID_REALTIME_ENTRY" });
          if (records.find((record) => record.id === id)?.placeholder) throw Object.assign(new Error("CREATE_BATTLE_FIRST"), { statusCode: 409, code: "CREATE_BATTLE_FIRST" });
          get(id).setRealtimeEntry(value);
          return snapshot(id);
        }
        async function remove(id) {
          assertReady();
          const target = records.find((record) => record.id === id);
          if (!target || target.placeholder) throw Object.assign(new Error("BATTLE_NOT_FOUND"), { statusCode: 404, code: "BATTLE_NOT_FOUND" });
          resetting = true;
          let archive, movedDefault = false;
          try {
            await Promise.allSettled([...activeTicks.values()]);
            if (get(id).snapshot().agents.some((agent) => agent.orders.some((order) => order.status === "OPEN"))) {
              throw Object.assign(new Error("BATTLE_HAS_PENDING_ORDERS"), { statusCode: 409, code: "BATTLE_HAS_PENDING_ORDERS" });
            }
            const placeholder = { id: "default", name: "", placeholder: true, createdAt: null, config: normalizeBattleConfig({}, policies) };
            const next = id === "default" ? [placeholder, ...records.slice(1)] : records.filter((record) => record.id !== id);
            if (file) {
              archive = path.join(path.dirname(file), "simulation-archives", crypto.randomUUID());
              fs.mkdirSync(archive, { recursive: true });
              fs.writeFileSync(path.join(archive, "deleted-battle.json"), JSON.stringify({ version: 1, battle: target, snapshot: snapshot(id) }), { mode: 384 });
              const ledger = ledgerFile(id);
              if (fs.existsSync(ledger)) fs.copyFileSync(ledger, path.join(archive, path.basename(ledger)));
              if (id === "default" && fs.existsSync(file)) {
                fs.renameSync(file, path.join(archive, "original-default.json"));
                movedDefault = true;
              }
            }
            const fresh = id === "default" ? makeSimulation(placeholder) : null;
            if (fresh) fresh.setEnabled(false);
            if (registryFile) {
              fs.writeFileSync(`${registryFile}.tmp`, JSON.stringify({ version: 1, battles: next, creationRequests }), { mode: 384 });
              fs.renameSync(`${registryFile}.tmp`, registryFile);
            }
            records = next;
            simulations.delete(id);
            if (fresh) simulations.set("default", fresh);
            emitChange({ battleId: id, reason: "battle-deleted", deleted: true });
            return { battles: list(), leaderboard: leaderboard() };
          } catch (error) {
            if (movedDefault) fs.copyFileSync(path.join(archive, "original-default.json"), file);
            throw error;
          } finally {
            resetting = false;
          }
        }
        async function reset() {
          assertReady();
          resetting = true;
          let archive, movedDefault = false;
          try {
            await Promise.allSettled([...activeTicks.values()]);
            const next = [{ id: "default", name: "", placeholder: true, createdAt: null, config: normalizeBattleConfig({}, policies) }];
            if (file) {
              archive = path.join(path.dirname(file), "simulation-archives", crypto.randomUUID());
              fs.mkdirSync(archive, { recursive: true });
              fs.writeFileSync(path.join(archive, "simulation-battles.json"), JSON.stringify({ version: 1, battles: records, creationRequests }), { mode: 384 });
              for (const record of records) {
                const ledger = ledgerFile(record.id);
                if (fs.existsSync(ledger)) fs.copyFileSync(ledger, path.join(archive, path.basename(ledger)));
              }
              if (fs.existsSync(file)) {
                fs.renameSync(file, path.join(archive, "original-default.json"));
                movedDefault = true;
              }
            }
            const fresh = makeSimulation(next[0]);
            fresh.setEnabled(false);
            if (registryFile) {
              fs.writeFileSync(`${registryFile}.tmp`, JSON.stringify({ version: 1, battles: next, creationRequests }), { mode: 384 });
              fs.renameSync(`${registryFile}.tmp`, registryFile);
            }
            records = next;
            simulations.clear();
            simulations.set("default", fresh);
            emitChange({ battleId: "*", reason: "battles-reset" });
            return snapshot("default");
          } catch (error) {
            if (movedDefault) fs.copyFileSync(path.join(archive, "original-default.json"), file);
            throw error;
          } finally {
            resetting = false;
          }
        }
        return {
          snapshot,
          liveSnapshot,
          summary,
          list,
          summaries,
          create,
          findCreation,
          leaderboard,
          getStrategies,
          setStrategies,
          touch,
          topUp,
          setEnabled,
          setEmotion,
          setActionUrge,
          setRealtimeEntry,
          end,
          marketFailure(id, code) {
            assertReady();
            get(id).marketFailure(code);
          },
          retryConnection(id = "default") {
            assertReady();
            get(id).retryConnection();
            return snapshot(id);
          },
          reset,
          remove,
          subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
          },
          async tick() {
            if (resetting) return;
            const started = [];
            for (const [id, sim] of simulations) {
              if (activeTicks.has(id)) continue;
              const task = Promise.resolve().then(() => sim.tick()).finally(() => activeTicks.delete(id));
              activeTicks.set(id, task);
              started.push(task);
            }
            await Promise.allSettled(started);
          }
        };
      }
      module.exports = { MAX_AGENTS, MAX_AI_DECISION_CONCURRENCY, createSimulationBattles, normalizeBattleConfig, limitExternalDecisionProvider };
    }
  });

  // simulation-market-source.js
  var require_simulation_market_source = __commonJS({
    "simulation-market-source.js"(exports, module) {
      var { PERIODS, validateMarket, quoteFromBook } = require_prediction_sim();
      var fail = (code) => Object.assign(new Error(code), { code, statusCode: 409 });
      var PRACTICE = "public-spot";
      var OFFICIAL = "binance-prediction";
      var practiceId = (slot, symbol, duration) => `practice-v1:${symbol}:${slot}:${duration}`;
      var isPractice = (id) => String(id).startsWith("practice-v1:");
      function createPublicPracticeSource({ fetchImpl = fetch, now = Date.now } = {}) {
        const cache = /* @__PURE__ */ new Map(), pending = /* @__PURE__ */ new Map();
        async function candle(symbol, openTime, completed) {
          const key = `${symbol}:${openTime}:${completed}`;
          if (cache.has(key)) return cache.get(key);
          if (pending.has(key)) return pending.get(key);
          const task = (async () => {
            const params = new URLSearchParams({ symbol, interval: "1m", startTime: String(openTime), limit: "1" });
            const response = await fetchImpl(`https://data-api.binance.vision/api/v3/klines?${params}`, {
              signal: AbortSignal.timeout(8e3),
              headers: { accept: "application/json" }
            });
            if (!response.ok) throw fail("PRACTICE_PRICE_UNAVAILABLE");
            const rows = await response.json(), row = rows?.[0];
            if (!Array.isArray(rows) || rows.length !== 1 || !Array.isArray(row) || Number(row[0]) !== openTime || Number(row[6]) !== openTime + 59999 || !Number.isFinite(Number(row[1])) || Number(row[1]) <= 0 || !Number.isFinite(Number(row[4])) || Number(row[4]) <= 0 || openTime > now() || completed && Number(row[6]) >= now()) throw fail("PRACTICE_PRICE_UNAVAILABLE");
            const result = { open: Number(row[1]), close: Number(row[4]), openTime, closeTime: Number(row[6]) };
            cache.set(key, result);
            if (cache.size > 500) cache.delete(cache.keys().next().value);
            return result;
          })();
          pending.set(key, task);
          try {
            return await task;
          } finally {
            pending.delete(key);
          }
        }
        function topic(slot, symbol, duration) {
          const id = practiceId(slot, symbol, duration);
          return validateMarket({
            marketTopicId: id,
            marketSource: PRACTICE,
            simulated: true,
            title: `${symbol} \xB7 Practice`,
            symbol,
            marketVariant: "CRYPTO_UP_DOWN",
            collateral: "USDT",
            startDate: slot,
            endDate: slot + duration,
            rules: "spot-1m-open-to-final-close;2x;tie-refund;no-fee",
            markets: [{ marketId: id, status: "REGISTERED", tradingStatus: "OPEN", outcomes: [
              { name: "Up", tokenId: `${id}:UP`, price: 0.5 },
              { name: "Down", tokenId: `${id}:DOWN`, price: 0.5 }
            ] }]
          }, slot, symbol, duration);
        }
        function parse(id) {
          const match = /^practice-v1:(BTCUSDT|ETHUSDT|BNBUSDT):(\d+):(\d+)$/.exec(String(id));
          if (!match || !Object.values(PERIODS).includes(Number(match[3]))) throw fail("INVALID_MARKET");
          return topic(Number(match[2]), match[1], Number(match[3]));
        }
        return {
          async marketFor(slot, symbol, duration) {
            return topic(slot, symbol, duration);
          },
          async detail(id) {
            const market = parse(id);
            if (now() < market.startDate) return market;
            const first = await candle(market.symbol, market.startDate, false);
            market.variantData = { startPrice: first.open };
            if (now() >= market.endDate) {
              const last = await candle(market.symbol, market.endDate - 6e4, true);
              market.variantData.endPrice = last.close;
              market.settlementEvidence = { source: "binance-spot-1m", first, last };
              market.markets[0].status = "RESOLVED";
              market.markets[0].tradingStatus = "CLOSED";
              for (const outcome of market.markets[0].outcomes) {
                outcome.winner = outcome.name === "Up" ? last.close > first.open : last.close < first.open;
                outcome.price = last.close === first.open ? 0.5 : outcome.winner ? 1 : 0;
              }
            }
            return market;
          },
          async book(market, direction) {
            const checked = parse(market.marketTopicId);
            if (now() < checked.startDate || now() >= checked.endDate) throw fail("QUOTE_WINDOW_MISSED");
            await candle(checked.symbol, checked.startDate, false);
            return {
              tokenId: `${checked.marketTopicId}:${direction}`,
              timestamp: now(),
              source: PRACTICE,
              simulated: true,
              asks: [{ price: 0.5, size: 1e12 }],
              bids: [{ price: 0.5, size: 1e12 }]
            };
          }
        };
      }
      function normalizeOfficialQuote(raw, { tokenId, amount, chainId, slippageBps, now }) {
        const amountIn = Number(raw?.amountIn), shares = Number(raw?.amountOut), fee = Number(raw?.feeAmount);
        const minReceive = Number(raw?.minReceive);
        const numericExpiry = Number(raw?.expireAt);
        const expiresAt = Number.isFinite(numericExpiry) ? numericExpiry < 1e10 ? numericExpiry * 1e3 : numericExpiry : Date.parse(raw?.expireAt);
        if (!raw?.quoteId || String(raw.tokenId) !== String(tokenId) || raw.side !== "BUY" || raw.orderType !== "MARKET" || String(raw.chainId) !== String(chainId) || Number(raw.slippageBps) !== slippageBps || !Number.isFinite(amountIn) || Math.abs(amountIn - amount) > 1e-8 || !Number.isFinite(shares) || shares <= 0 || !Number.isFinite(fee) || fee < 0 || !Number.isFinite(minReceive) || minReceive <= 0 || minReceive > shares || !Number.isFinite(expiresAt) || expiresAt <= now) throw fail("UNSAFE_LIVE_QUOTE");
        return {
          amount: amountIn,
          shares,
          averagePrice: amountIn / shares,
          odds: shares / amountIn,
          bookTime: now,
          expiresAt,
          minReceive,
          feeShares: fee,
          feesIncluded: true,
          gasIncluded: false,
          source: "official-quote",
          slippageBps,
          fills: []
        };
      }
      function estimatePredictionQuote(market, book, tokenId, amount, now) {
        const feeRateBps = Number(market.feeRateBps);
        if (market.vendor !== "PREDICT_FUN" || market.feeRateBps == null || market.feeRateBps === "" || !Number.isInteger(feeRateBps) || feeRateBps < 0 || feeRateBps > 1e4) throw fail("UNSUPPORTED_MARKET_FEES");
        const gross = quoteFromBook(book, tokenId, now, amount);
        const feeShares = gross.fills.reduce((sum, fill) => sum + feeRateBps / 1e4 * Math.min(fill.price, 1 - fill.price) * fill.shares / fill.price, 0);
        const shares = gross.shares - feeShares;
        if (!Number.isFinite(shares) || shares <= 0) throw fail("INVALID_BOOK");
        return {
          ...gross,
          shares,
          grossShares: gross.shares,
          feeShares,
          feeRateBps,
          averagePrice: amount / shares,
          odds: shares / amount,
          feesIncluded: true,
          gasIncluded: false,
          source: "real-book-fee-estimate",
          estimated: true,
          feeModel: "predict-taker-no-discount-v1",
          // Saved decision lifetime; an official execution quote is requested separately.
          expiresAt: now + 6e4
        };
      }
      function createSimulationMarketSource({ official, walletStatus, run, chainId = "56", fetchImpl, now = Date.now }) {
        const practice = createPublicPracticeSource({ fetchImpl, now });
        let status = "unknown", lastStatusAt = -Infinity, statusPending;
        async function connection(force = false) {
          if (!force && now() - lastStatusAt < 2e3) return status;
          if (!statusPending) statusPending = Promise.resolve().then(walletStatus).then((value) => {
            if (!["CONNECTED", "UNCONNECTED", "CREATING"].includes(value)) throw fail("WALLET_STATUS_UNAVAILABLE");
            status = value === "CONNECTED" ? "connected" : "unconnected";
            lastStatusAt = now();
            return status;
          }).catch((error) => {
            status = "unknown";
            lastStatusAt = -Infinity;
            throw error;
          }).finally(() => {
            statusPending = null;
          });
          return statusPending;
        }
        const sourceFor = (id) => isPractice(id) ? practice : official;
        async function marketFor(slot, symbol, duration) {
          const connected = await connection();
          if (connected === "unconnected") return practice.marketFor(slot, symbol, duration);
          return { ...await official.marketFor(slot, symbol, duration), marketSource: OFFICIAL, simulated: false };
        }
        return {
          marketFor,
          describe: () => ({ connection: status, nextMarketSource: status === "connected" ? OFFICIAL : status === "unconnected" ? PRACTICE : "unknown" }),
          async refreshMarket(market, slot, symbol, duration) {
            await connection(true);
            const expected = status === "connected" ? OFFICIAL : PRACTICE;
            if (market?.marketSource !== expected) return marketFor(slot, symbol, duration);
            return market;
          },
          detail: (id) => sourceFor(id).detail(id),
          book: (market, direction) => sourceFor(market.marketTopicId).book(market, direction),
          async quote(market, direction, amount, observedBook) {
            const tokenId = String(market.markets[0].outcomes.find((o) => o.name === (direction === "UP" ? "Up" : "Down")).tokenId);
            if (isPractice(market.marketTopicId)) {
              const quote = quoteFromBook(await practice.book(market, direction), tokenId, now(), amount);
              return { ...quote, source: "practice-fixed", feesIncluded: true, feeShares: 0, gasIncluded: false };
            }
            if (await connection(true) !== "connected") throw fail("WALLET_NOT_CONNECTED");
            const book = observedBook || await official.book(market, direction);
            return estimatePredictionQuote(market, book, tokenId, amount, now());
          },
          // Called only by the gated execution bridge using its persisted decision.
          // Paper play never requests a balance-dependent trading quote.
          async executionQuote(intent, slippageBps) {
            if (intent.marketSource !== OFFICIAL) throw fail("PRACTICE_INTENT_NOT_EXECUTABLE");
            if (!Number.isFinite(intent.expiresAt) || intent.expiresAt <= now()) throw fail("INTENT_EXPIRED");
            if (await connection(true) !== "connected") throw fail("WALLET_NOT_CONNECTED");
            const raw = (await run([
              "prediction",
              "trade",
              "quote",
              "--binanceChainId",
              chainId,
              "--tokenId",
              String(intent.tokenId),
              "--marketTopicId",
              String(intent.marketTopicId),
              "--side",
              "BUY",
              "--amount",
              String(intent.amount),
              "--orderType",
              "MARKET",
              "--slippageBps",
              String(slippageBps)
            ])).data;
            normalizeOfficialQuote(raw, { tokenId: intent.tokenId, amount: intent.amount, chainId, slippageBps, now: now() });
            return raw;
          }
        };
      }
      module.exports = { createPublicPracticeSource, createSimulationMarketSource, normalizeOfficialQuote, estimatePredictionQuote };
    }
  });

  // technical-indicators.js
  var require_technical_indicators = __commonJS({
    "technical-indicators.js"(exports, module) {
      var sum = (values) => values.reduce((a, b) => a + b, 0);
      var mean = (values) => sum(values) / values.length;
      var std = (values) => Math.sqrt(mean(values.map((value) => (value - mean(values)) ** 2)));
      function emaSeries(values, period) {
        const result = Array(values.length).fill(null);
        if (values.length < period) return result;
        result[period - 1] = mean(values.slice(0, period));
        for (let i = period; i < values.length; i++) result[i] = values[i] * 2 / (period + 1) + result[i - 1] * (1 - 2 / (period + 1));
        return result;
      }
      function wilderSeries(values, period) {
        if (values.length < period) return [];
        const result = [mean(values.slice(0, period))];
        for (const value of values.slice(period)) result.push((result.at(-1) * (period - 1) + value) / period);
        return result;
      }
      function extendedIndicators(rows, depth) {
        const c = rows.map((r) => r.close), last = rows.at(-1), n = rows.length;
        const result = {};
        const window20 = rows.slice(-20), typical = rows.map((r) => (r.high + r.low + r.close) / 3);
        result.sma = n >= 50 ? { sma5: mean(c.slice(-5)), sma20: mean(c.slice(-20)), sma50: mean(c.slice(-50)) } : null;
        const fast = emaSeries(c, 12), slow = emaSeries(c, 26);
        const macd = c.map((_, i) => slow[i] === null ? null : fast[i] - slow[i]).filter((v) => v !== null);
        const signal = emaSeries(macd, 9).at(-1);
        result.macd = typeof signal === "number" ? { line: macd.at(-1), signal, histogram: macd.at(-1) - signal } : null;
        const middle = mean(c.slice(-20)), deviation = std(c.slice(-20));
        result.bollinger = n >= 20 && deviation > 0 ? { middle, upper: middle + 2 * deviation, lower: middle - 2 * deviation, percentB: (last.close - middle + 2 * deviation) / (4 * deviation), bandwidthPct: 4 * deviation / middle * 100 } : null;
        const tr = [], plus = [], minus = [];
        for (let i = 1; i < n; i++) {
          tr.push(Math.max(rows[i].high - rows[i].low, Math.abs(rows[i].high - c[i - 1]), Math.abs(rows[i].low - c[i - 1])));
          const up = rows[i].high - rows[i - 1].high, down = rows[i - 1].low - rows[i].low;
          plus.push(up > down && up > 0 ? up : 0);
          minus.push(down > up && down > 0 ? down : 0);
        }
        const ranges = wilderSeries(tr, 14), plusSmooth = wilderSeries(plus, 14), minusSmooth = wilderSeries(minus, 14);
        result.atr = ranges.length ? { value: ranges.at(-1), percent: ranges.at(-1) / last.close * 100 } : null;
        const dx = ranges.map((range2, i) => {
          const total = plusSmooth[i] + minusSmooth[i];
          return total > 0 ? 100 * Math.abs(plusSmooth[i] - minusSmooth[i]) / total : 0;
        });
        const adx = wilderSeries(dx, 14).at(-1), range = ranges.at(-1);
        result.adx = Number.isFinite(adx) && range > 0 ? { adx, plusDI: 100 * plusSmooth.at(-1) / range, minusDI: 100 * minusSmooth.at(-1) / range } : null;
        const ks = [];
        for (let i = Math.max(13, n - 3); i < n; i++) {
          const window2 = rows.slice(i - 13, i + 1), high2 = Math.max(...window2.map((r) => r.high)), low2 = Math.min(...window2.map((r) => r.low));
          ks.push(high2 > low2 ? 100 * (c[i] - low2) / (high2 - low2) : null);
        }
        result.stochastic = ks.length === 3 && ks.every(Number.isFinite) ? { k: ks.at(-1), d: mean(ks) } : null;
        result.williams = ks.at(-1) === null || !ks.length ? null : ks.at(-1) - 100;
        const tp20 = typical.slice(-20), tpMean = mean(tp20), mad = mean(tp20.map((v) => Math.abs(v - tpMean)));
        result.cci = n >= 20 && mad > 0 ? (typical.at(-1) - tpMean) / (0.015 * mad) : null;
        let positiveFlow = 0, negativeFlow = 0;
        for (let i = Math.max(1, n - 14); i < n; i++) {
          const flow = typical[i] * rows[i].volume;
          if (typical[i] > typical[i - 1]) positiveFlow += flow;
          if (typical[i] < typical[i - 1]) negativeFlow += flow;
        }
        result.mfi = n >= 15 && positiveFlow + negativeFlow > 0 ? 100 * positiveFlow / (positiveFlow + negativeFlow) : null;
        result.obv = n >= 21 ? { change20: sum(rows.slice(-20).map((r, i) => Math.sign(r.close - c[n - 21 + i]) * r.volume)) } : null;
        const volume20 = sum(window20.map((r) => r.volume));
        const quoteVolume20 = window20.every((r) => Number.isFinite(r.quoteVolume)) ? sum(window20.map((r) => r.quoteVolume)) : null;
        const vwap = quoteVolume20 !== null && volume20 > 0 ? quoteVolume20 / volume20 : null;
        result.vwap = n >= 20 && vwap > 0 ? { value: vwap, distancePct: (last.close / vwap - 1) * 100 } : null;
        result.roc = n >= 21 ? { tenMinutes: (last.close / c.at(-11) - 1) * 100, twentyMinutes: (last.close / c.at(-21) - 1) * 100 } : null;
        result.momentum = n >= 11 ? last.close - c.at(-11) : null;
        result.volatility = n >= 21 ? { perMinutePct: std(c.slice(-20).map((v, i) => Math.log(v / c[n - 21 + i]))) * 100 } : null;
        const prior = rows.slice(-21, -1), high = Math.max(...prior.map((r) => r.high)), low = Math.min(...prior.map((r) => r.low));
        result.donchian = n >= 21 ? { upper: high, lower: low, close: last.close, breakout: last.close > high ? 1 : last.close < low ? -1 : 0 } : null;
        const flow5 = rows.slice(-5), total5 = sum(flow5.map((r) => r.volume));
        const buy5 = flow5.every((r) => Number.isFinite(r.takerBuyVolume)) ? sum(flow5.map((r) => r.takerBuyVolume)) : null;
        result.takerFlow = n >= 5 && total5 > 0 && buy5 !== null ? { buyRatio: buy5 / total5, netBase: 2 * buy5 - total5, totalBase: total5 } : null;
        const bid = Number(depth.bids[0][0]), ask = Number(depth.asks[0][0]), bidSize = Number(depth.bids[0][1]), askSize = Number(depth.asks[0][1]), mid = (bid + ask) / 2;
        const microprice = (ask * bidSize + bid * askSize) / (bidSize + askSize);
        result.spread = ask > bid ? { basisPoints: (ask - bid) / mid * 1e4, mid, microprice, micropriceBiasBps: (microprice / mid - 1) * 1e4 } : null;
        result.cmf = n >= 20 && volume20 > 0 ? sum(window20.map((r) => r.high === r.low ? 0 : (2 * r.close - r.low - r.high) / (r.high - r.low) * r.volume)) / volume20 : null;
        result.longReturns = n >= 61 ? { fifteenMinutes: (last.close / c.at(-16) - 1) * 100, sixtyMinutes: (last.close / c.at(-61) - 1) * 100 } : null;
        return result;
      }
      module.exports = { extendedIndicators, emaSeries, wilderSeries };
    }
  });

  // market-indicators.js
  var require_market_indicators = __commonJS({
    "market-indicators.js"(exports, module) {
      var SOURCE = "Binance Spot \xB7 data-api.binance.vision";
      var { extendedIndicators } = require_technical_indicators();
      var { indicators: indicatorCatalog } = require_strategy_catalog();
      var ALLOWED_SYMBOLS = /* @__PURE__ */ new Set(["BTCUSDT", "ETHUSDT", "BNBUSDT"]);
      var PRICE_ACTION_INTERVALS = Object.freeze({ "5m": ["1m", 1], "15m": ["3m", 3], "1h": ["15m", 15], "1d": ["4h", 240] });
      function indicatorError(code, statusCode = 503) {
        return Object.assign(new Error(code), { code, statusCode });
      }
      function finite(value, code = "INDICATOR_DATA_INVALID") {
        if (typeof value !== "number" && typeof value !== "string" || String(value).trim() === "") throw indicatorError(code);
        const number = Number(value);
        if (!Number.isFinite(number)) throw indicatorError(code);
        return number;
      }
      function ema(values, period) {
        if (!Array.isArray(values) || values.length < period) throw indicatorError("INDICATOR_DATA_INCOMPLETE");
        const seed = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
        const multiplier = 2 / (period + 1);
        return values.slice(period).reduce((result, value) => value * multiplier + result * (1 - multiplier), seed);
      }
      function rsi(values, period = 14) {
        if (!Array.isArray(values) || values.length < period + 1) throw indicatorError("INDICATOR_DATA_INCOMPLETE");
        const changes = values.slice(1).map((value, index) => value - values[index]);
        let gain = changes.slice(0, period).reduce((sum, value) => sum + Math.max(0, value), 0) / period;
        let loss = changes.slice(0, period).reduce((sum, value) => sum + Math.max(0, -value), 0) / period;
        for (const change of changes.slice(period)) {
          gain = (gain * (period - 1) + Math.max(0, change)) / period;
          loss = (loss * (period - 1) + Math.max(0, -change)) / period;
        }
        if (loss === 0) return gain === 0 ? 50 : 100;
        return 100 - 100 / (1 + gain / loss);
      }
      function parseKline(row) {
        if (!Array.isArray(row) || row.length < 7) throw indicatorError("INDICATOR_DATA_INVALID");
        const parsed = {
          openTime: finite(row[0]),
          open: finite(row[1]),
          high: finite(row[2]),
          low: finite(row[3]),
          close: finite(row[4]),
          volume: finite(row[5]),
          closeTime: finite(row[6]),
          quoteVolume: row.length > 7 ? finite(row[7]) : null,
          takerBuyVolume: row.length > 9 ? finite(row[9]) : null
        };
        if (parsed.open <= 0 || parsed.close <= 0 || parsed.volume < 0 || parsed.openTime % 6e4 !== 0 || parsed.closeTime - parsed.openTime !== 59999) {
          throw indicatorError("INDICATOR_DATA_INVALID");
        }
        if (parsed.low <= 0 || parsed.high < Math.max(parsed.open, parsed.close) || parsed.low > Math.min(parsed.open, parsed.close) || parsed.quoteVolume !== null && parsed.quoteVolume < 0 || parsed.takerBuyVolume !== null && (parsed.takerBuyVolume < 0 || parsed.takerBuyVolume > parsed.volume)) throw indicatorError("INDICATOR_DATA_INVALID");
        return parsed;
      }
      function priceActionWindow(klines, receivedAt, timeframe = "5m", intervalMinutes = 1) {
        const timestamp = finite(receivedAt);
        const expectedMs = intervalMinutes * 6e4;
        const rows = Array.isArray(klines) ? klines.map((row) => {
          if (!Array.isArray(row) || row.length < 7) throw indicatorError("INDICATOR_DATA_INVALID");
          const candle = { openTime: finite(row[0]), open: finite(row[1]), high: finite(row[2]), low: finite(row[3]), close: finite(row[4]), closeTime: finite(row[6]) };
          if (candle.open <= 0 || candle.close <= 0 || candle.low <= 0 || candle.high < Math.max(candle.open, candle.close) || candle.low > Math.min(candle.open, candle.close) || candle.openTime % expectedMs !== 0 || candle.closeTime - candle.openTime !== expectedMs - 1) throw indicatorError("INDICATOR_DATA_INVALID");
          return candle;
        }) : [];
        const completed = rows.filter((row) => row.closeTime < timestamp);
        if (completed.length < 20) throw indicatorError("INDICATOR_DATA_INCOMPLETE");
        return { intervalMinutes, targetMinutes: { "5m": 5, "15m": 15, "1h": 60, "1d": 1440 }[timeframe] || 5, bars: completed.slice(-20) };
      }
      function depthTotal(rows) {
        if (!Array.isArray(rows) || !rows.length) throw indicatorError("INDICATOR_DATA_INCOMPLETE");
        return rows.reduce((sum, row) => {
          if (!Array.isArray(row) || row.length < 2) throw indicatorError("INDICATOR_DATA_INVALID");
          const price = finite(row[0]);
          const quantity = finite(row[1]);
          if (price <= 0 || quantity <= 0) throw indicatorError("INDICATOR_DATA_INVALID");
          return sum + price * quantity;
        }, 0);
      }
      function calculateIndicatorSnapshot({ symbol, klines, depth, receivedAt }) {
        const normalizedSymbol = String(symbol || "").toUpperCase();
        if (!ALLOWED_SYMBOLS.has(normalizedSymbol)) throw indicatorError("INDICATOR_SYMBOL_UNSUPPORTED", 400);
        const rows = Array.isArray(klines) ? klines.map(parseKline) : [];
        if (rows.length < 21) throw indicatorError("INDICATOR_DATA_INCOMPLETE");
        if (rows.some((row, index) => index && row.openTime - rows[index - 1].openTime !== 6e4)) throw indicatorError("INDICATOR_DATA_INVALID");
        const timestamp = finite(receivedAt);
        const latest = rows.at(-1);
        if (latest.openTime > timestamp + 2e3 || timestamp - latest.openTime > 9e4) throw indicatorError("INDICATOR_DATA_STALE");
        const completed = rows.filter((row) => row.closeTime < timestamp);
        if (completed.length < 21) throw indicatorError("INDICATOR_DATA_INCOMPLETE");
        const volumeRow = completed.at(-1);
        if (volumeRow.closeTime < Math.floor(timestamp / 6e4) * 6e4 - 1) throw indicatorError("INDICATOR_DATA_STALE");
        const closes = completed.map((row) => row.close);
        const volumeIndex = rows.indexOf(volumeRow);
        const priorVolumes = rows.slice(Math.max(0, volumeIndex - 20), volumeIndex).map((row) => row.volume);
        if (!priorVolumes.length) throw indicatorError("INDICATOR_DATA_INCOMPLETE");
        const averageVolume = priorVolumes.reduce((sum, value) => sum + value, 0) / priorVolumes.length;
        const bidNotional = depthTotal(depth?.bids);
        const askNotional = depthTotal(depth?.asks);
        const depthNotional = bidNotional + askNotional;
        if (Number(depth.bids[0][0]) >= Number(depth.asks[0][0]) || depth.bids.some((row, i) => i && Number(row[0]) >= Number(depth.bids[i - 1][0])) || depth.asks.some((row, i) => i && Number(row[0]) <= Number(depth.asks[i - 1][0]))) throw indicatorError("INDICATOR_DATA_INVALID");
        if (averageVolume <= 0 || depthNotional <= 0) throw indicatorError("INDICATOR_DATA_INVALID");
        const fiveMinuteBase = completed.at(-6)?.close;
        if (!fiveMinuteBase) throw indicatorError("INDICATOR_DATA_INCOMPLETE");
        const result = {
          symbol: normalizedSymbol,
          source: SOURCE,
          dataTimestamp: timestamp,
          candleOpenTime: latest.openTime,
          indicatorCandleCloseTime: volumeRow.closeTime,
          priceChangeBasis: "completed-1m-close-to-close",
          rsiMethod: "Wilder",
          volumeCandleTime: volumeRow.openTime,
          price: latest.close,
          candles: priceActionWindow(klines, timestamp, "5m", 1),
          priceChangePct: {
            oneMinute: (volumeRow.close / completed.at(-2).close - 1) * 100,
            fiveMinutes: (volumeRow.close / fiveMinuteBase - 1) * 100
          },
          rsi14: rsi(closes, 14),
          ema: { ema5: ema(closes, 5), ema20: ema(closes, 20) },
          volumeRatio: volumeRow.volume / averageVolume,
          spotOrderBookImbalance: (bidNotional - askNotional) / depthNotional,
          ...extendedIndicators(completed, depth),
          calculationVersion: 2,
          completedCandles: completed.length,
          indicatorBasis: "completed-1m; SMA-seeded EMA; Wilder RSI/ATR/DMI/ADX; population stdev; rolling VWAP; prior-range Donchian"
        };
        result.availability = Object.fromEntries(Object.values(indicatorCatalog).filter((item) => item.key !== "odds").map((item) => [
          item.key,
          result[item.snapshotKey] == null ? "UNAVAILABLE_HISTORY_OR_DENOMINATOR" : "READY"
        ]));
        return result;
      }
      function createBinanceIndicatorSource({ fetchImpl = fetch, now = Date.now, baseUrl = "https://data-api.binance.vision/api/v3" } = {}) {
        const cache = /* @__PURE__ */ new Map();
        const pending = /* @__PURE__ */ new Map();
        async function get(endpoint, params) {
          let response;
          try {
            response = await fetchImpl(`${baseUrl}/${endpoint}?${new URLSearchParams(params)}`, {
              signal: AbortSignal.timeout(8e3),
              headers: { accept: "application/json" }
            });
          } catch {
            throw indicatorError("INDICATOR_SOURCE_UNAVAILABLE");
          }
          if (!response?.ok) throw indicatorError("INDICATOR_SOURCE_UNAVAILABLE");
          try {
            return await response.json();
          } catch {
            throw indicatorError("INDICATOR_DATA_INVALID");
          }
        }
        async function snapshot(symbol = "BTCUSDT", timeframe = "5m") {
          const normalizedSymbol = String(symbol || "").toUpperCase();
          if (!ALLOWED_SYMBOLS.has(normalizedSymbol)) throw indicatorError("INDICATOR_SYMBOL_UNSUPPORTED", 400);
          const normalizedTimeframe = Object.hasOwn(PRICE_ACTION_INTERVALS, String(timeframe).toLowerCase()) ? String(timeframe).toLowerCase() : "5m";
          const [priceActionInterval, intervalMinutes] = PRICE_ACTION_INTERVALS[normalizedTimeframe];
          const cacheKey = `${normalizedSymbol}:${normalizedTimeframe}`;
          const cached = cache.get(cacheKey);
          if (cached && now() - cached.dataTimestamp < 1500) return structuredClone(cached);
          if (pending.has(cacheKey)) return structuredClone(await pending.get(cacheKey));
          const request = (async () => {
            const requestStartedAt = now();
            const [klines, depth, timeframeKlines] = await Promise.all([
              get("klines", { symbol: normalizedSymbol, interval: "1m", limit: "200" }),
              get("depth", { symbol: normalizedSymbol, limit: "20" }),
              priceActionInterval === "1m" ? Promise.resolve(null) : get("klines", { symbol: normalizedSymbol, interval: priceActionInterval, limit: "30" })
            ]);
            const result = calculateIndicatorSnapshot({ symbol: normalizedSymbol, klines, depth, receivedAt: now() });
            if (timeframeKlines) result.candles = priceActionWindow(timeframeKlines, now(), normalizedTimeframe, intervalMinutes);
            result.availability.candles = "READY";
            result.dataTimestamp = requestStartedAt;
            result.receivedAt = now();
            result.freshnessBasis = "request-start-and-latest-completed-candle";
            result.raw = { klines: structuredClone(klines), depth: structuredClone(depth), ...timeframeKlines ? { priceActionKlines: structuredClone(timeframeKlines) } : {} };
            cache.set(cacheKey, result);
            return result;
          })();
          pending.set(cacheKey, request);
          try {
            return structuredClone(await request);
          } finally {
            pending.delete(cacheKey);
          }
        }
        return { snapshot };
      }
      module.exports = { SOURCE, PRICE_ACTION_INTERVALS, calculateIndicatorSnapshot, createBinanceIndicatorSource, priceActionWindow, ema, rsi };
    }
  });

  // paper-trading.js
  var require_paper_trading = __commonJS({
    "paper-trading.js"(exports, module) {
      var fs = require_fs();
      var path = require_path();
      var crypto = require_crypto2();
      var SOURCE = "Binance Spot \xB7 data-api.binance.vision";
      function fail(code, statusCode = 409) {
        return Object.assign(new Error(code), { code, statusCode });
      }
      function createPaperTrading({ file, fetchImpl = fetch, now = Date.now } = {}) {
        let state = { version: 1, balanceCents: 1e4, orders: [] };
        if (file && fs.existsSync(file)) {
          state = JSON.parse(fs.readFileSync(file, "utf8"));
          if (state.version !== 1 || !Number.isSafeInteger(state.balanceCents) || state.balanceCents < 0 || !Array.isArray(state.orders)) {
            throw new Error("Invalid paper ledger. Refusing to reset balances.");
          }
        }
        let queue = Promise.resolve();
        const cache = /* @__PURE__ */ new Map();
        const inflight = /* @__PURE__ */ new Map();
        function serial(task) {
          const result = queue.then(task);
          queue = result.catch(() => {
          });
          return result;
        }
        function save(next) {
          if (file) {
            fs.mkdirSync(path.dirname(file), { recursive: true });
            const temp = `${file}.tmp`;
            fs.writeFileSync(temp, JSON.stringify(next), { mode: 384 });
            fs.renameSync(temp, file);
          }
          state = next;
        }
        function symbolCheck(symbol) {
          if (!["BTCUSDT", "ETHUSDT", "BNBUSDT"].includes(symbol)) throw fail("PAPER_INVALID_SYMBOL", 400);
        }
        async function get(endpoint, params) {
          try {
            const response = await fetchImpl(`https://data-api.binance.vision/api/v3/${endpoint}?${new URLSearchParams(params)}`, {
              signal: AbortSignal.timeout(8e3),
              headers: { accept: "application/json" }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
          } catch {
            throw fail("MARKET_UNAVAILABLE", 503);
          }
        }
        function fresh(quote) {
          return quote && now() - quote.tradeTime <= 15e3 && quote.tradeTime <= now() + 2e3;
        }
        async function price(symbol, { force = false } = {}) {
          symbolCheck(symbol);
          const cached = cache.get(symbol);
          if (!force && cached && now() - cached.receivedAt < 2e3 && fresh(cached)) return cached;
          if (inflight.has(symbol)) return inflight.get(symbol);
          const pending = (async () => {
            const rows = await get("aggTrades", { symbol, limit: "1" });
            const row = rows?.[0];
            const quote = { symbol, price: Number(row?.p), tradeTime: Number(row?.T), receivedAt: now(), source: SOURCE };
            if (!Number.isFinite(quote.price) || quote.price <= 0 || !fresh(quote)) throw fail("MARKET_STALE", 503);
            cache.set(symbol, quote);
            return quote;
          })();
          inflight.set(symbol, pending);
          try {
            return await pending;
          } finally {
            inflight.delete(symbol);
          }
        }
        async function closingPrice(order) {
          const start = order.expiresAt - 1e3;
          const rows = await get("klines", { symbol: order.symbol, interval: "1s", startTime: String(start), endTime: String(order.expiresAt - 1), limit: "1" });
          const row = rows?.[0];
          const close = Number(row?.[4]);
          if (Number(row?.[0]) !== start || Number(row?.[6]) !== order.expiresAt - 1 || !Number.isFinite(close) || close <= 0) {
            throw fail("SETTLEMENT_UNAVAILABLE", 503);
          }
          return close;
        }
        async function settle() {
          const next = structuredClone(state);
          let changed = false;
          let waiting = false;
          const closes = /* @__PURE__ */ new Map();
          for (const order of next.orders) {
            if (order.status !== "OPEN" || now() < order.expiresAt + 2e3) continue;
            try {
              const key = `${order.symbol}:${order.expiresAt}`;
              if (!closes.has(key)) closes.set(key, await closingPrice(order));
              const close = closes.get(key);
              const won = order.direction === "UP" ? close > order.entryPrice : close < order.entryPrice;
              order.status = close === order.entryPrice ? "TIE" : won ? "WON" : "LOST";
              order.exitPrice = close;
              order.payoutCents = order.status === "TIE" ? order.amountCents : won ? order.amountCents * 2 : 0;
              order.settledAt = now();
              next.balanceCents += order.payoutCents;
              changed = true;
            } catch {
              waiting = true;
            }
          }
          if (changed) save(next);
          return waiting;
        }
        function snapshot(waiting) {
          return {
            mode: "paper",
            source: SOURCE,
            balance: state.balanceCents / 100,
            reserved: state.orders.filter((o) => o.status === "OPEN").reduce((sum, o) => sum + o.amountCents, 0) / 100,
            settlementPending: waiting,
            orders: state.orders.slice().reverse(),
            serverTime: now()
          };
        }
        return {
          price,
          account: () => serial(async () => snapshot(await settle())),
          place: (body) => serial(async () => {
            const { symbol, direction, clientOrderId } = body;
            symbolCheck(symbol);
            if (!["UP", "DOWN"].includes(direction)) throw fail("PAPER_INVALID_DIRECTION", 400);
            if (typeof clientOrderId !== "string" || !/^[\w-]{8,80}$/.test(clientOrderId)) throw fail("PAPER_INVALID_ID", 400);
            if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(String(body.amount))) throw fail("PAPER_INVALID_AMOUNT", 400);
            const cents = Math.round(Number(body.amount) * 100);
            if (cents < 100 || cents > 1e3) throw fail("PAPER_INVALID_AMOUNT", 400);
            const existing = state.orders.find((o) => o.clientOrderId === clientOrderId);
            if (existing) {
              if (existing.symbol !== symbol || existing.direction !== direction || existing.amountCents !== cents) throw fail("PAPER_ID_CONFLICT");
              return { mode: "paper", order: existing, duplicate: true };
            }
            if (state.orders.length >= 1e4) throw fail("PAPER_LEDGER_FULL");
            await settle();
            if (state.balanceCents < cents) throw fail("PAPER_INSUFFICIENT_BALANCE");
            const quote = await price(symbol);
            if (!fresh(quote)) throw fail("MARKET_STALE", 503);
            const order = {
              id: crypto.randomUUID(),
              clientOrderId,
              symbol,
              direction,
              amountCents: cents,
              entryPrice: quote.price,
              entryTradeTime: quote.tradeTime,
              openedAt: now(),
              expiresAt: Math.ceil(now() / 1e3) * 1e3 + 3e5,
              status: "OPEN",
              source: SOURCE
            };
            save({ ...state, balanceCents: state.balanceCents - cents, orders: [...state.orders, order] });
            return { mode: "paper", order, duplicate: false };
          })
        };
      }
      module.exports = { createPaperTrading };
    }
  });

  // public/strategy-widget.js
  var require_strategy_widget = __commonJS({
    "public/strategy-widget.js"(exports, module) {
      ((root) => {
        const statuses = {
          running: "\u8FD0\u884C\u4E2D",
          paused: "\u5DF2\u6682\u505C",
          ended: "\u5DF2\u7ED3\u675F",
          settling: "\u7ED3\u7B97\u4E2D",
          reconnecting: "\u8FDE\u63A5\u6062\u590D\u4E2D",
          "retry-paused": "\u7B49\u5F85\u91CD\u8BD5",
          "awaiting-settlement": "\u7B49\u5F85\u7ED3\u7B97"
        };
        function project(battles, { now = Date.now(), t: t2 = (v) => v, label = (p) => p.strategy || "AI", icon = () => "", network = "online" } = {}) {
          const amount = (v) => typeof v === "number" && Number.isFinite(v) ? v.toFixed(2) : "\u2014";
          const rows = battles.filter((b) => !b.placeholder).flatMap((b) => (b.agents || []).map((a) => {
            const orders = (a.orders || []).filter((o) => o.status === "OPEN");
            const current = orders.filter((o) => o.start <= now && o.end > now);
            const direction = [...new Set(current.map((o) => o.direction))].map((d) => t2(d === "UP" ? "\u770B\u6DA8" : d === "DOWN" ? "\u770B\u7A7A" : "\u89C2\u671B")).join(" / ");
            const profit = a.equity - b.config.initialBalance - (a.addedCapital || 0);
            const state = network === "error" ? "\u884C\u60C5\u8FDE\u63A5\u4E2D\u65AD" : b.error || b.aiConnectionFailure ? "\u7B49\u5F85\u6062\u590D" : statuses[b.status] || "\u7B49\u5F85\u66F4\u65B0";
            return {
              battleId: b.id,
              agentId: a.id,
              name: label(a.policy || {}),
              battleName: b.name,
              icon: icon(a.policy || {}),
              coin: a.policy?.coin || "",
              funds: `${t2("\u6A21\u62DF\u8D44\u91D1")}  ${amount(a.equity)} U`,
              profit: `${t2("\u5DF2\u7ED3\u7B97\u6536\u76CA")}  ${profit > 0 ? "+" : ""}${amount(profit)} U`,
              positive: Number.isFinite(profit) && profit >= 0,
              action: direction || t2(orders.length ? "\u7B49\u5F85\u7ED3\u7B97" : "\u89C2\u671B"),
              status: t2(state),
              key: JSON.stringify([b.id, a.id])
            };
          }));
          return { rows, labels: {
            title: t2("\u7B56\u7565\u6218\u51B5"),
            hint: t2("\u4E0A\u4E0B\u6ED1\u52A8\u5207\u6362 \xB7 \u70B9\u51FB\u67E5\u770B\u8BE6\u60C5"),
            empty: t2("\u6682\u65E0\u7B56\u7565\uFF0C\u70B9\u51FB\u6253\u5F00\u5E94\u7528\u5F00\u4E00\u5C40"),
            snapshot: t2("\u5FEB\u7167"),
            age: t2("\u8DDD\u66F4\u65B0 %s"),
            stale: t2("\u66F4\u65B0\u4E2D\u65AD\uFF0C\u70B9\u51FB\u6253\u5F00\u5E94\u7528"),
            unavailable: t2("\u8BFB\u53D6\u5931\u8D25\uFF0C\u663E\u793A\u4E0A\u6B21\u5FEB\u7167"),
            paper: t2("\u6A21\u62DF"),
            open: t2("\u6253\u5F00\u5E94\u7528")
          } };
        }
        if (typeof module === "object" && module.exports) {
          module.exports = { project };
          return;
        }
        if (!root.Capacitor?.isNativePlatform?.()) return;
        const api = root.Warrior?.simulationApi;
        const plugin = root.Capacitor.Plugins?.StrategyWidget || root.Capacitor.registerPlugin?.("StrategyWidget");
        if (!api || !plugin) return;
        const t = (v) => root.Warrior.i18n?.t(v) || v;
        let pending = false, again = false, timer, lastSignature = "", lastSent = 0;
        async function sync() {
          if (pending) {
            again = true;
            return;
          }
          pending = true;
          try {
            const { battles } = await api.list();
            const snapshots = await Promise.all(battles.filter((b) => !b.placeholder).map((b) => api.snapshot(b.id)));
            const payload = project(snapshots, {
              t,
              network: api.networkStatus?.().status,
              label: (p) => t(root.Warrior.agentLabel(p)),
              icon: (p) => root.Warrior.skins?.get(root.Warrior.skins.resolveId(p))?.imageUrl || ""
            });
            const signature = JSON.stringify(payload);
            if (signature !== lastSignature || Date.now() - lastSent >= 25e3) {
              if (api.serviceOwned) {
                const words = ["\u6A21\u62DF\u8D44\u91D1", "\u5DF2\u7ED3\u7B97\u6536\u76CA", "\u770B\u6DA8", "\u770B\u7A7A", "\u89C2\u671B", "\u7B49\u5F85\u7ED3\u7B97", "\u884C\u60C5\u8FDE\u63A5\u4E2D\u65AD", "\u7B49\u5F85\u6062\u590D", ...Object.values(statuses)];
                await api.configureWidget({
                  labels: payload.labels,
                  words: Object.fromEntries(words.map((word) => [word, t(word)])),
                  names: payload.rows.map((row) => ({ key: row.key, name: row.name, icon: row.icon }))
                });
              } else await plugin.update({ snapshot: payload });
              lastSignature = signature;
              lastSent = Date.now();
            }
          } catch {
            lastSignature = "";
            await plugin.unavailable().catch(() => {
            });
          } finally {
            pending = false;
            if (again) {
              again = false;
              schedule();
            }
          }
        }
        function schedule() {
          clearTimeout(timer);
          timer = setTimeout(() => void sync(), 250);
        }
        api.subscribe?.(schedule);
        root.addEventListener("warrior-language-change", schedule);
        root.addEventListener("warrior-mobile-network", schedule);
        root.addEventListener("pageshow", schedule);
        root.document.addEventListener("visibilitychange", schedule);
        setInterval(schedule, 3e4);
        schedule();
        let opening = false, openAgain = false;
        async function openPending() {
          if (opening) {
            openAgain = true;
            return;
          }
          opening = true;
          try {
            const target = await plugin.consumeOpen();
            if (target.battleId && target.agentId) await root.Warrior.openStrategy(target.battleId, target.agentId);
          } catch {
            root.toast?.(t("\u8BE5\u7B56\u7565\u5DF2\u79FB\u9664\u6216\u6682\u65F6\u65E0\u6CD5\u8BFB\u53D6"));
          } finally {
            opening = false;
            if (openAgain) {
              openAgain = false;
              void openPending();
            }
          }
        }
        plugin.addListener("openStrategy", () => void openPending());
        void openPending();
        const section = document.createElement("section");
        section.className = "strategy-widget-settings";
        section.innerHTML = '<h3>\u684C\u9762\u5C0F\u7EC4\u4EF6</h3><p>\u5728\u624B\u673A\u684C\u9762\u4E0A\u4E0B\u6ED1\u52A8\u67E5\u770B\u7B56\u7565\u6218\u51B5\u3002\u7CFB\u7EDF\u6682\u505C\u540E\u53F0\u65F6\uFF0C\u663E\u793A\u4E0A\u6B21\u5FEB\u7167\u3002</p><button type="button" class="secondary">\u6DFB\u52A0\u5230\u684C\u9762</button><p role="status"></p>';
        section.style.cssText = "border-top:1px solid #d1bce3;margin-top:20px;padding-top:12px";
        const button = section.querySelector("button");
        button.style.minHeight = "48px";
        button.onclick = async () => {
          button.disabled = true;
          try {
            await sync();
            const result = await plugin.pin();
            section.querySelector("[role=status]").textContent = result.supported ? "\u8BF7\u5728\u7CFB\u7EDF\u5F39\u7A97\u4E2D\u6DFB\u52A0\u5C0F\u7EC4\u4EF6" : "\u8BF7\u957F\u6309\u684C\u9762 \u2192 \u5C0F\u7EC4\u4EF6 \u2192 10U \u6218\u795E";
          } catch {
            section.querySelector("[role=status]").textContent = "\u8BF7\u957F\u6309\u684C\u9762 \u2192 \u5C0F\u7EC4\u4EF6 \u2192 10U \u6218\u795E";
          } finally {
            button.disabled = false;
          }
        };
        document.querySelector("#battle-settings-dialog")?.append(section);
      })(typeof window === "undefined" ? null : window);
    }
  });

  // mobile/runtime.cjs
  var require_runtime = __commonJS({
    "mobile/runtime.cjs"() {
      var { createSimulationBattles } = require_simulation_battles();
      var { createSimulationMarketSource } = require_simulation_market_source();
      var { createBinanceIndicatorSource } = require_market_indicators();
      var { createPaperTrading } = require_paper_trading();
      var { createPositionValuation } = require_position_valuation();
      var { createAiConnections } = require_ai_connections();
      var { normalizePolicy, buildDecisionContext, validateDecision, decisionAudit } = require_ai_decision();
      var catalog = require_strategy_catalog();
      var { nativeFetch } = require_http();
      var fail = (code) => Object.assign(new Error(code), { code });
      function createMobileRuntime({ fetchImpl = nativeFetch, now = Date.now, autoStart = true } = {}) {
        if (!globalThis.WarriorStorageNative?.call) throw fail("MOBILE_STORAGE_UNAVAILABLE");
        const network = { status: "connecting", lastSuccess: null, error: null };
        function emitNetwork() {
          globalThis.dispatchEvent?.(new CustomEvent("warrior-mobile-network", { detail: { ...network } }));
        }
        async function marketFetch(url, options) {
          try {
            const response = await fetchImpl(url, options);
            if (!response.ok) throw fail("MARKET_UNAVAILABLE");
            network.status = "online";
            network.lastSuccess = now();
            network.error = null;
            emitNetwork();
            return response;
          } catch (error) {
            network.status = "error";
            network.error = "MARKET_UNAVAILABLE";
            emitNetwork();
            throw error;
          }
        }
        const ai = createAiConnections({ file: "/mobile/data/ai-connections.json", fetchImpl, now, secretCodec: {
          seal: (value) => ({ nativeVault: 1, value }),
          unseal: (sealed) => {
            if (sealed?.nativeVault !== 1 || typeof sealed.value !== "string") throw fail("AI_VAULT_UNAVAILABLE");
            return sealed.value;
          }
        } });
        const source = createSimulationMarketSource({
          fetchImpl: marketFetch,
          now,
          walletStatus: async () => "UNCONNECTED",
          official: { detail: async () => {
            throw fail("MOBILE_PAPER_ONLY");
          } },
          run: async () => {
            throw fail("MOBILE_PAPER_ONLY");
          }
        });
        const indicators = createBinanceIndicatorSource({ fetchImpl: marketFetch, now });
        const prices = createPaperTrading({ fetchImpl: marketFetch, now });
        const simulation = createSimulationBattles({
          source,
          indicatorSource: indicators,
          decisionProvider: ai.router,
          file: "/mobile/data/rule-ai-ledger.json",
          now,
          leaseEnabled: false,
          pauseOnRestore: true,
          pauseOnError: true
        });
        const valuation = createPositionValuation({ source, now });
        const capabilities = {
          version: 8,
          idempotentCreation: true,
          minInitialBalance: 10,
          aiPerBattleModels: true,
          strategies: Object.keys(catalog.profiles),
          indicators: Object.keys(catalog.indicators),
          assets: ["BTC", "ETH", "BNB"],
          periods: ["5m", "15m", "1h", "1d"],
          streakEmotion: true,
          battleEmotion: true,
          actionUrge: true,
          battleActionUrge: true,
          priceActionCandles: true,
          realtimeEntry: true
        };
        const getStrategies = async () => ({ ...simulation.getStrategies(), capabilities });
        async function preview(strategy) {
          if (!Object.hasOwn(catalog.profiles, strategy)) throw fail("AI_STRATEGY_INVALID");
          const policy = normalizePolicy({ strategy, coin: "BTC", maxStakePct: 10, allowAllIn: false }, "preview");
          const snapshot = await indicators.snapshot("BTCUSDT");
          const time = now();
          const input = buildDecisionContext({
            market: {
              roundId: `preview-${time}`,
              timeframe: "5m",
              secondsToClose: 300,
              upOdds: 2,
              downOdds: 2,
              dataTimestamp: snapshot.dataTimestamp
            },
            indicators: snapshot,
            policy,
            account: { balance: 100, initialBalance: 100, wins: 0, losses: 0, winStreak: 0, lossStreak: 0, openStake: 0 }
          });
          const engine = ai.router.describeFor(input);
          if (!["mock", "off", "offline", "legacy"].includes(engine.mode)) input.policy.review_mode = "model";
          let modelRequest = null, plan = null, rejection = null;
          const raw = await ai.router.decide(input, { deadlineMs: time + 1e4, now, onRequest: (value) => {
            modelRequest = value;
          } });
          try {
            plan = validateDecision(raw, { input, indicators: snapshot, policy, now: now() });
          } catch (error) {
            rejection = error.code || "AI_RESPONSE_INVALID";
          }
          return {
            mode: "preview",
            ordersCreated: 0,
            assumptions: { balance: 100, upOdds: 2, downOdds: 2, maxStakePct: 10 },
            engine,
            raw,
            plan,
            rejection,
            modelRequest,
            ...plan ? { audit: decisionAudit({ provider: ai.router, input, plan, indicators: snapshot, raw }) } : {}
          };
        }
        async function request(url, options = {}) {
          try {
            options.signal?.throwIfAborted();
            const body = options.body ? JSON.parse(options.body) : {};
            const mutation = options.method === "POST";
            if (mutation && ["/api/ai/connections", "/api/ai/connections/test"].includes(url)) {
              let target;
              try {
                target = new URL(body.baseUrl);
              } catch {
                throw fail("AI_URL_INVALID");
              }
              if (target.protocol !== "https:") throw fail("MOBILE_HTTPS_REQUIRED");
            }
            let data;
            if (url === "/api/ai/settings" && !mutation) data = ai.snapshot();
            else if (url === "/api/ai/connections" && mutation) data = await ai.save(body);
            else if (url === "/api/ai/connections/test" && mutation) data = await ai.save(body, true);
            else if (url === "/api/ai/connections/check" && mutation) data = await ai.testConnection(body.provider, body.revision);
            else if (url === "/api/ai/connections/remove" && mutation) data = ai.remove(body.provider);
            else if (url === "/api/ai/assignments" && mutation) data = ai.assign(body.strategy, body.connectionId);
            else if (url === "/api/ai/preview" && mutation) data = await preview(body.strategy);
            else throw fail("MOBILE_API_UNAVAILABLE");
            return Response.json(data);
          } catch (error) {
            return Response.json({ code: error.code || "MOBILE_SERVICE_FAILED", error: error.code || "MOBILE_SERVICE_FAILED" }, { status: error.statusCode || 503 });
          }
        }
        const api = {
          mode: "native",
          keepInBackground: true,
          walletSupported: false,
          clientId: "android-local",
          list: async () => {
            const battles = simulation.summaries();
            return { battles, leaderboard: simulation.leaderboard(battles) };
          },
          snapshot: async (id) => simulation.liveSnapshot(id || "default"),
          report: async (id) => simulation.snapshot(id || "default"),
          subscribe: (listener) => simulation.subscribe(listener),
          async create(name, config = {}, requestId) {
            const prior = simulation.findCreation(requestId, name, config);
            if (prior) return prior;
            ai.assertAgents(config.agents);
            return simulation.create(name, config, null, requestId);
          },
          async setEnabled(id, enabled, { isCancelled = () => false } = {}) {
            if (enabled) {
              const battle = simulation.snapshot(id);
              if (battle.aiConnectionFailure) {
                ai.assertAgents(battle.config.agents);
                for (const [connection, revision] of new Map(battle.config.agents.filter((a) => a.aiConnectionId && a.aiConnectionId !== "none").map((a) => [a.aiConnectionId, a.aiConnectionRevision]))) await ai.testConnection(connection, revision);
              }
            }
            if (enabled && isCancelled()) throw fail("MOBILE_CONTROL_CANCELLED");
            return simulation.setEnabled(enabled, id);
          },
          topUp: async (id, agentId, amount, requestId) => simulation.topUp(id, agentId, amount, requestId),
          setEmotion: async (id, value) => simulation.setEmotion(value, id),
          setActionUrge: async (id, value) => simulation.setActionUrge(value, id),
          setRealtimeEntry: async (id, value) => simulation.setRealtimeEntry(value, id),
          end: async (id, reason) => simulation.end(id, reason),
          retryConnection: async (id) => simulation.retryConnection(id),
          reset: () => simulation.reset(),
          remove: (id) => simulation.remove(id),
          release: () => false,
          getStrategies,
          strategies: getStrategies,
          setStrategies: async (agents) => simulation.setStrategies(agents),
          indicators: (symbol) => indicators.snapshot(symbol),
          prices: async (symbol = "BTCUSDT") => ({ mode: "paper", prices: [await prices.price(symbol)] }),
          valuation: async (id) => ({ ...await valuation(simulation.snapshot(id)), recovery: simulation.snapshot(id).recovery || null }),
          executions: async () => ({ executions: [], quotesEnabled: false, tradingEnabled: false }),
          networkStatus: () => ({ ...network }),
          checkNetwork: async () => ({ mode: "paper", prices: [await prices.price("BTCUSDT", { force: true })] }),
          tick: () => simulation.tick()
        };
        let timer;
        const advance = () => {
          void simulation.tick();
        };
        if (autoStart) {
          timer = setInterval(advance, 1e3);
          globalThis.addEventListener("pageshow", advance);
          globalThis.addEventListener("online", advance);
          globalThis.document?.addEventListener("visibilitychange", advance);
        }
        api.dispose = () => {
          clearInterval(timer);
          globalThis.removeEventListener?.("pageshow", advance);
          globalThis.removeEventListener?.("online", advance);
          globalThis.document?.removeEventListener("visibilitychange", advance);
        };
        return { api, request };
      }
      globalThis.WarriorMobileRuntime = { create: createMobileRuntime };
      globalThis.WarriorWidgetProject = require_strategy_widget().project;
    }
  });
  require_runtime();
})();
/*! Bundled license information:

@noble/hashes/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
