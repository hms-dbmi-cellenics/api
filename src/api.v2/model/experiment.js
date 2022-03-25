const _ = require('lodash');

/* eslint-disable func-names */
const generateBasicModelFunctions = require('../helpers/generateBasicModelFunctions');
const sqlClient = require('../../sql/sqlClient');
const { aggregateIntoJson } = require('../../sql/helpers');

const getLogger = require('../../utils/getLogger');

const logger = getLogger('[ExperimentModel] - ');

const experimentTable = 'experiment';
const experimentExecutionTable = 'experiment_execution';

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
  tableName: experimentTable,
  selectableProps: experimentFields,
});

const getExperimentData = async (experimentId) => {
  const sql = sqlClient.get();

  function query() {
    this.select('*')
      .from(experimentTable)
      .leftJoin(experimentExecutionTable, `${experimentTable}.id`, `${experimentExecutionTable}.experiment_id`)
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

  const trx = await sql.transaction();

  try {
    const result = await trx(experimentTable).update({
      samples_order: trx.raw(`(
        SELECT jsonb_insert(samples_order - ${oldPosition}, '{${newPosition}}', samples_order -> ${oldPosition}, false)
        FROM (
          SELECT (samples_order)
          FROM experiment e
          WHERE e.id = '${experimentId}'
        ) samples_order
      )`),
    }).where('id', experimentId)
      .returning(['samples_order']);

    const { samples_order: samplesOrder = null } = result[0] || {};

    if (_.isNil(samplesOrder)
      || !_.inRange(oldPosition, 0, samplesOrder.length - 1)
      || !_.inRange(newPosition, 0, samplesOrder.length - 1)
    ) {
      logger.log('Invalid positions or samples_order was broken, rolling back transaction');
      throw new Error('Invalid update parameters');
    }

    trx.commit();
  } catch (e) {
    trx.rollback();
    throw e;
  }
};

module.exports = {
  getExperimentData,
  updateSamplePosition,
  ...basicModelFunctions,
};
