const hash = require('object-hash');

const mockCreateObjectHash = jest.fn(
  (object) => hash.MD5(object),
);

module.exports = mockCreateObjectHash;
