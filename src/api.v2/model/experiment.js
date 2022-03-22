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

  // const a = await sql(tableName).update({
  //   samples_order: sql.jsonSet(
  //     sql.jsonSet('samples_order', `${oldPosition}`, `samples_order -> ${newPosition}`),
  //     `${newPosition}`,
  //     `samples_order -> ${oldPosition}`,
  //   ),
  //   // sql.raw(`jsonb_set(jsonb_set(samples_order, '{${oldPosition}}', samples_order -> ${newPosition}), '{${newPosition}}', samples_order -> ${oldPosition})`),
  //   // update "experiment" set "samples_order" = (jsonb_set(jsonb_set("samples_order", '{0}', 'samples_order -> 1'), '{1}', 'samples_order -> 0')) where "id" = 'c7749b4c-9f9f-a8ba-de74-390c6b033fea'
  // }).where('id', experimentId);

  await sql(tableName).update({
    samples_order: sql.raw(
      `jsonb_set(jsonb_set(samples_order, '{${oldPosition}}', samples_order -> ${newPosition}), '{${newPosition}}', samples_order -> ${oldPosition})`,
    ),
  }).where('id', experimentId);

  // await sql.raw(`
  //   UPDATE ${tableName}
  //   SET samples_order = jsonb_set(jsonb_set(samples_order, '{${oldPosition}}', samples_order -> ${newPosition}), '{${newPosition}}', samples_order -> ${oldPosition})
  //   WHERE id = '${experimentId}';
  // `);

  // 'update "item" set "samples_order" = jsonb_set(jsonb_set(samples_order, \'{0}\', samples_order -> 1), \'{1}\', samples_order -> 0) where "id" = \'c7749b4c-9f9f-a8ba-de74-390c6b033fea\'';
};

module.exports = {
  getExperimentData,
  updateSamplePosition,
  ...basicModelFunctions,
};
