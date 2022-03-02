const knex = require('knex');

const SQLClient = (() => {
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

module.exports = SQLClient;
