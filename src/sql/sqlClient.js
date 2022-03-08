const knex = require('knex');

const sqlClient = (() => {
  let instance;

  return {
    get: (knexConfig) => {
      if (!instance && knexConfig) {
        instance = knex.default(knexConfig);
      }

      return instance;
    },
  };
})();

module.exports = sqlClient;
