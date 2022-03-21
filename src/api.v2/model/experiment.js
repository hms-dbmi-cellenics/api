/* eslint-disable func-names */

const generateBasicModelFunctions = require('../helpers/generateBasicModelFunctions');
const sqlClient = require('../../sql/sqlClient');
const { jsonAggregate, sqlToCamelCased } = require('../../sql/helpers');

const tableName = 'experiment';

const experimentFields = [
  'id',
  'name',
  'description',
  'samples_order',
  'notify_by_email',
  'created_at',
  'updated_at',
];


const experimentExecutionFields = [
  'params_hash', 'state_machine_arn', 'execution_arn',
];

const basicModelFunctions = generateBasicModelFunctions({
  tableName,
  selectableProps: experimentFields,
});

const getExperimentData = async (experimentId) => {
  const sql = sqlClient.get();

  const results = await sql
    .select([...sqlToCamelCased(experimentFields), jsonAggregate('pipeline_type', experimentExecutionFields, 'pipelines', sql)])
    .from(function () {
      this.select('*')
        .from(tableName)
        .leftJoin('experiment_execution', `${tableName}.id`, 'experiment_execution.experiment_id')
        .where('id', experimentId)
        .as('experiment_with_exec');
    }).groupBy(experimentFields);

  return results[0];
};

module.exports = {
  getExperimentData,
  ...basicModelFunctions,
};
