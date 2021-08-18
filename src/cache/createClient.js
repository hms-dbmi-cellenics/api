const Redis = require('ioredis');
const logger = require('../utils/logging');
const config = require('../config');

const createClient = (options) => {
  const { host, port, endpoint } = options;

  const clientOptions = {
    host,
    port,
    tls: {},
    reconnectOnError: () => true,
    retryStrategy: (times) => {
      if (times > 10) {
        logger.error(`redis:${endpoint}`, 'Failed to establish connection.');
        return false;
      }

      const delay = Math.min(times * 1000, 3000);
      return delay;
    },
  };

  if (config.clusterEnv === 'development') {
    logger.log('Running in development, patching out TLS connection.');
    clientOptions.tls = null;
  }


  const redis = new Redis(clientOptions);

  redis.on('connect', () => {
    logger.log(`redis:${endpoint}`, 'Connection successfully established.');
  });

  redis.on('ready', () => {
    logger.log(`redis:${endpoint}`, 'Connection ready.');
  });

  redis.on('error', (error) => {
    logger.error(`redis:${endpoint}`, 'An error occurred:');
    logger.error(`redis:${endpoint}`, error);
  });

  return redis;
};

module.exports = createClient;
