const getRDSParams = require('./getRDSParams');

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: '127.0.0.1',
      port: 5432,
      user: 'api_role',
      password: 'postgres', // pragma: allowlist secret
      database: 'aurora_db',
    },
  },
  staging: {
    client: 'postgresql',
    connection: getRDSParams(),
  },
  production: {
    client: 'postgresql',
    connection: getRDSParams(),
    pool: {
      min: 2,
      max: 10,
    },
  },
};
