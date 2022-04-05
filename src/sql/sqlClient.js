const knex = require('knex');
const { types } = require('pg');

const TIMESTAMPZ = 1184;

const setCustomParsers = () => {
  // Default timestampz parser returns an object which breaks swagger's validation
  // With this we can override that parser to return a string
  types.setTypeParser(TIMESTAMPZ, (dateString) => dateString);
};

const sqlClient = (() => {
  let instance;

  return {
    get: (knexConfig) => {
      if (!instance && knexConfig) {
        setCustomParsers();

        instance = knex.default(knexConfig);
      }

      return instance;
    },
  };
})();

module.exports = sqlClient;
