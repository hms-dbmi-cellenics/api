const config = require('../config');

const CacheSingleton = require('../SQL');
const knexfile = require('../SQL/knexfile');

const getLogger = require('../utils/getLogger');

const logger = getLogger();

module.exports = async () => {
  logger.log('Generating configuration for sql client...');

  const knexConfig = (await knexfile())[config.clusterEnv];

  logger.log(`SQL endpoint at: ${knexConfig.connection.host}`);

  CacheSingleton.get(knexConfig);

  logger.log('SQLClient instance created.');
};
