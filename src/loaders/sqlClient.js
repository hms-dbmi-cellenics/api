const config = require('../config');

const sqlClient = require('../sql/sqlClient');
const knexfile = require('../sql/knexfile');

const getLogger = require('../utils/getLogger');

const logger = getLogger();

module.exports = async () => {
  logger.log('Generating configuration for sql client...');

  const knexConfig = (await knexfile())[config.clusterEnv];

  logger.log(`sql endpoint at: ${knexConfig.connection.host}`);

  sqlClient.get(knexConfig);

  logger.log('sqlClient instance created.');
};
