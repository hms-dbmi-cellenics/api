const { createAdapter } = require('socket.io-redis');

const logger = require('../utils/logging');
const { generateConfig } = require('../cache/generate-config');
const CacheSingleton = require('../cache');

module.exports = async (io) => {
  logger.log('Generating configuration for cache...');
  const config = await generateConfig();

  logger.log(`Primary: ${config.primary.host}:${config.primary.port}, reader: ${config.reader.host}:${config.reader.port}`);

  const cacheInstance = CacheSingleton.get(config);
  logger.log('Cache instance created.');

  io.adapter(createAdapter({
    pubClient: cacheInstance.getClientAndStatus('primary').client,
    subClient: cacheInstance.getClientAndStatus('reader').client,
  }));
};
