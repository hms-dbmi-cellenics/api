/* eslint-disable func-names */
const generateBasicModelFunctions = require('../helpers/generateBasicModelFunctions');
const sqlClient = require('../../sql/sqlClient');
const { aggregateIntoJson } = require('../../sql/helpers');

const { NotFoundError } = require('../../utils/responses');

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

  if (result.length === 0) {
    throw new NotFoundError('Experiment not found');
  }

  return result[0];
};

const updateSamplePosition = async (experimentId, oldPosition, newPosition) => {
  const sql = sqlClient.get();

  // Switches values between the item at newPosition and the one at oldPosition
  await sql(tableName).update({
    samples_order: sql.raw(
      `jsonb_set(
        jsonb_set(
          samples_order, 
          '{${oldPosition}}', 
          samples_order -> ${newPosition}
        ), 
        '{${newPosition}}', 
        samples_order -> ${oldPosition}
      )`,
    ),
  }).where('id', experimentId);
};

module.exports = {
  getExperimentData,
  updateSamplePosition,
  ...basicModelFunctions,
};
