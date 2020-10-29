const hash = require('object-hash');
const config = require('../config');
const CacheSingleton = require('../cache');
const logger = require('./logging');

const createObjectHash = (object) => hash.MD5(object);

const cacheGetRequest = async (
  data,
) => {
  const { sandboxId } = config;

  const key = createObjectHash({
    experimentId: data.experimentId,
    body: data.body,
    sandboxId,
  });

  logger.log(`Looking up data in cache under key ${key}`);

  const cache = CacheSingleton.get();
  const payload = await cache.get(key);
  return payload;
};


const cacheSetResponse = async (data, ttl = 900) => {
  const { sandboxId } = config;

  const key = createObjectHash({
    experimentId: data.request.experimentId,
    body: data.request.body,
    sandboxId,
  });

  logger.log(`Putting data in cache under key ${key}`);

  const cache = CacheSingleton.get();
  await cache.set(key, data, ttl);
};

module.exports = { cacheGetRequest, cacheSetResponse };
