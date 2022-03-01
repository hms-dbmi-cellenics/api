const { createAdapter } = require('socket.io-redis');

const getLogger = require('../utils/getLogger');
const { generateConfig } = require('../cache/generateConfig');
const CacheSingleton = require('../cache');

const logger = getLogger();

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
