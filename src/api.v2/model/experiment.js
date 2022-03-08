
const sqlClient = require('../../SQL/sqlClient').get();
// const createGuts = require('../helpers/model-guts')

// const name = 'Project';
const tableName = 'experiment';


module.exports = {
  create: async (
    id, name, description,
  ) => {
    await sqlClient.insert({
      id, name, description,
    }).into(tableName);
  },
};
