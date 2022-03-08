const sqlClient = require('../../SQL/sqlClient');

// The guts of a model that uses Knexjs to store and retrieve data from a
// database using the provided `knex` instance. Custom functionality can be
// composed on top of this set of common guts.
//
// The idea is that these are the most-used types of functions that most/all
// "models" will want to have.

// Copied from https://github.com/robmclarty/knex-express-project-sample/blob/main/server/helpers/model-guts.js
module.exports = ({
  tableName,
  selectableProps = [],
  timeout = 1000,
}) => {
  const create = (props) => sqlClient.get().insert(props)
    .returning(selectableProps)
    .into(tableName)
    .timeout(timeout);

  const findAll = () => sqlClient.get().select(selectableProps)
    .from(tableName)
    .timeout(timeout);

  const find = (filters) => sqlClient.get().select(selectableProps)
    .from(tableName)
    .where(filters)
    .timeout(timeout);

  // Same as `find` but only returns the first match if >1 are found.
  const findOne = (filters) => find(filters)
    .then((results) => {
      if (!Array.isArray(results)) return results;

      return results[0];
    });

  const findById = (id) => sqlClient.get().select(selectableProps)
    .from(tableName)
    .where({ id })
    .timeout(timeout);

  const update = (id, props) => sqlClient.get().update(props)
    .from(tableName)
    .where({ id })
    .returning(selectableProps)
    .timeout(timeout);

  const destroy = (id) => sqlClient.get().del()
    .from(tableName)
    .where({ id })
    .timeout(timeout);

  return {
    tableName,
    selectableProps,
    timeout,
    create,
    findAll,
    find,
    findOne,
    findById,
    update,
    destroy,
  };
};
