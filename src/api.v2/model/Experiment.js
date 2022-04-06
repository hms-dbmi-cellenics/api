const _ = require('lodash');

const BasicModel = require('../helpers/BasicModel');
const sqlClient = require('../../sql/sqlClient');
const { aggregateIntoJson } = require('../../sql/helpers');

const { NotFoundError } = require('../../utils/responses');

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

class Experiment extends BasicModel {
  constructor(sql = sqlClient.get()) {
    super(sql, experimentTable, experimentFields);
  }

  async getExperimentData(experimentId) {
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

    const result = await aggregateIntoJson(
      query, experimentFields, experimentExecutionFields, 'pipeline_type', 'pipelines', this.sql,
    ).first();

    if (_.isEmpty(result)) {
      throw new NotFoundError('Experiment not found');
    }

    return result;
  }

  // Sets samples_order as an array that has the sample in oldPosition moved to newPosition
  async updateSamplePosition(
    experimentId, oldPosition, newPosition,
  ) {
    const trx = await this.sql.transaction();

    try {
      const result = await trx(experimentTable)
        .update({
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
  }

  async addSample(experimentId, sampleId) {
    await this.sql(experimentTable)
      .update({
        samples_order: this.sql.raw(`samples_order || '["${sampleId}"]'::jsonb`),
      })
      .where('id', experimentId);
  }

  async removeSample(experimentId, sampleId) {
    await this.sql(experimentTable)
      .update({
        samples_order: this.sql.raw(`samples_order - '${sampleId}'`),
      })
      .where('id', experimentId);
  }
}

module.exports = Experiment;
