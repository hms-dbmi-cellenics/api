/* eslint-disable func-names */

const generateBasicModelFunctions = require('../helpers/generateBasicModelFunctions');
const sqlClient = require('../../sql/sqlClient');
const { aggregateIntoJson } = require('../../sql/helpers');

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

  function query() {
    this.select('*')
      .from(tableName)
      .leftJoin('experiment_execution', `${tableName}.id`, 'experiment_execution.experiment_id')
      .where('id', experimentId)
      .as('experiment_with_exec');
  }

  const a = await sql.select('*')
    .from(tableName)
    .leftJoin('experiment_execution', `${tableName}.id`, 'experiment_execution.experiment_id')
    .where('id', experimentId)
    .as('experiment_with_exec');

  console.log('aDebug');
  console.log(a);

  const result = await aggregateIntoJson(query, experimentFields, experimentExecutionFields, 'pipeline_type', 'pipelines', sql);

  return result[0];
};

module.exports = {
  getExperimentData,
  ...basicModelFunctions,
};
