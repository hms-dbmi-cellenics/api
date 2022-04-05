const _ = require('lodash');

/* eslint-disable func-names */
const generateBasicModelFunctions = require('../helpers/generateBasicModelFunctions');
const sqlClient = require('../../sql/sqlClient');
const { collapseKeyIntoArray } = require('../../sql/helpers');

const getLogger = require('../../utils/getLogger');

const { NotFoundError } = require('../../utils/responses');

const logger = getLogger('[ExperimentModel] - ');

const experimentTable = 'experiment';
const experimentExecutionTable = 'experiment_execution';
const userAccessTable = 'user_access';
const metadataTrackTable = 'metadata_track';

const experimentFields = [
  'id',
  'name',
  'description',
  'samples_order',
  'notify_by_email',
  'processing_config',
  'created_at',
  'updated_at',
];

const basicModelFunctions = generateBasicModelFunctions({
  tableName: experimentTable,
  selectableProps: experimentFields,
});

const getAllExperiments = async (userId) => {
  const sql = sqlClient.get();

  const fields = [
    'id',
    'name',
    'description',
    'samples_order',
    'notify_by_email',
    'created_at',
    'updated_at',
  ];

  const aliasedExperimentFields = fields.map((field) => `e.${field}`);
  function mainQuery() {
    this.select([...aliasedExperimentFields, 'm.key'])
      .from(userAccessTable)
      .where('user_id', userId)
      .join(`${experimentTable} as e`, 'e.id', `${userAccessTable}.experiment_id`)
      .leftJoin(`${metadataTrackTable} as m`, 'e.id', 'm.experiment_id')
      .as('mainQuery');
  }

  const result = await collapseKeyIntoArray(mainQuery, [...fields], 'key', 'metadataKeys', sql);

  return result;
};

const getExperimentData = async (experimentId) => {
  const sql = sqlClient.get();

  function mainQuery() {
    this.select('*')
      .from(experimentTable)
      .leftJoin(experimentExecutionTable, `${experimentTable}.id`, `${experimentExecutionTable}.experiment_id`)
      .where('id', experimentId)
      .as('mainQuery');
  }

  const experimentExecutionFields = [
    'params_hash', 'state_machine_arn', 'execution_arn',
  ];

  const experimentExecutionKeys = experimentExecutionFields.reduce((acum, current) => {
    acum.push(`'${current}'`);
    acum.push(current);

    return acum;
  }, []);

  const replaceNullsWithObject = (object, nullableKey) => (
    `COALESCE(
      ${object}
      FILTER(
        WHERE ${nullableKey} IS NOT NULL
      ),
      '{}'::jsonb
    )`
  );

  const result = await sql
    .select([
      ...experimentFields,
      sql.raw(
        `${replaceNullsWithObject(
          `jsonb_object_agg(pipeline_type, json_build_object(${experimentExecutionKeys.join(', ')}))`,
          'pipeline_type',
        )} as pipelines`,
      ),
    ])
    .from(mainQuery)
    .groupBy(experimentFields)
    .first();

  if (_.isEmpty(result)) {
    throw new NotFoundError('Experiment not found');
  }

  return result;
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

    const { samplesOrder = null } = result[0] || {};

    if (_.isNil(samplesOrder)
      || !_.inRange(oldPosition, 0, samplesOrder.length)
      || !_.inRange(newPosition, 0, samplesOrder.length)
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
  getAllExperiments,
  getExperimentData,
  updateSamplePosition,
  ...basicModelFunctions,
};
