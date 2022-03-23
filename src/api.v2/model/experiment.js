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

  const experimentExecutionFields = [
    'params_hash', 'state_machine_arn', 'execution_arn',
  ];

  const result = await aggregateIntoJson(query, experimentFields, experimentExecutionFields, 'pipeline_type', 'pipelines', sql);

  return result[0];
};

const updateSamplePosition = async (experimentId, oldPosition, newPosition) => {
  const sql = sqlClient.get();

  // Sets samples_order as an array that has the sample in oldPosition moved to newPosition
  const result = await sql(tableName).update({
    samples_order: sql.raw(`(
      SELECT jsonb_insert(samples_order - ${oldPosition}, '{${newPosition}}', samples_order -> ${oldPosition}, false)
      FROM (
        SELECT (samples_order)
        FROM experiment e
        WHERE e.id = '${experimentId}'
      ) samples_order
    )`),
  }).where('id', experimentId)
    .returning(['samples_order']);

  return result;
};

module.exports = {
  getExperimentData,
  updateSamplePosition,
  ...basicModelFunctions,
};
