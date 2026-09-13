// Only virtual app-private paths are used by the shared simulation modules.
const join = (...parts) => parts.join('/').replace(/\/+/g, '/');
const dirname = value => value.slice(0, value.lastIndexOf('/')) || '/';
const basename = value => value.slice(value.lastIndexOf('/') + 1);
module.exports = { join, dirname, basename };
