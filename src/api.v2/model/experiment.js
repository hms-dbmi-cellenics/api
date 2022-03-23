/* eslint-disable func-names */
const _ = require('lodash');

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

  const newPositionPreviousValueModifier = oldPosition < newPosition ? -1 : 0;
  const newPositionAfterRemove = newPosition + newPositionPreviousValueModifier;
  // const rawString = oldPosition < newPosition ? (
  //   `SELECT array[:]`
  // ) : (

  // );

  const selectResult = await sql(tableName).select('samples_order').where('id', experimentId);

  if (selectResult.length === 0) {
    return 0;
  }

  const samplesOrder = _.clone(selectResult[0].samples_order);

  const sampleId = samplesOrder[oldPosition];

  console.log('newPositionAfterRemoveDebug');
  console.log(newPositionAfterRemove);

  // Switches values between the item at newPosition and the one at oldPosition
  const result = await sql(tableName).update({
    samples_order: sql.raw(`
    (SELECT jsonb_insert(samples_order - '${sampleId}', '{${newPositionAfterRemove}}', '"${sampleId}"')
    FROM (
      SELECT (samples_order)
      FROM experiment e
      WHERE e.id = '${experimentId}'
    ) samples_order)
    `),
  }).where('id', experimentId)
    .returning(['samples_order']);

  // const result = await sql.raw(`
  //   UPDATE "experiment" SET "samples_order" = (
  //   SELECT jsonb_insert(samples_order - '${sampleId}',
  // '{${newPositionInFilteredArray}}', '"${sampleId}"')
  //   FROM (
  //     SELECT (samples_order)
  //     FROM experiment e
  //     WHERE e.id = '${experimentId}'
  //   ) samples_order )
  //   `);

  console.log('resultDebug');
  console.log(result);

  return result;
};

module.exports = {
  getExperimentData,
  updateSamplePosition,
  ...basicModelFunctions,
};
