const hash = require('object-hash');

const createObjectHash = (object) => hash.MD5(object);

module.exports = createObjectHash;
