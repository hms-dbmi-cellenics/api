const _ = require('lodash');

const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');
const { collapseKeyIntoArray } = require('../../sql/helpers');

const { getAwsUserAttributesByEmail } = require('../../utils/aws/user');
const { NotFoundError } = require('../../utils/responses');
const getLogger = require('../../utils/getLogger');

const logger = getLogger('[ExperimentModel] - ');

const tableNames = require('../helpers/tableNames');
const AccessRole = require('../../utils/enums/AccessRole');

const experimentFields = [
  'id',
  'name',
  'description',
  'samples_order',
  'processing_config',
  'notify_by_email',
  'created_at',
  'updated_at',
];

class Experiment extends BasicModel {
  constructor(sql = sqlClient.get()) {
    super(sql, tableNames.EXPERIMENT, experimentFields);
  }

  async getAllExperiments(userId) {
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
        .from(tableNames.USER_ACCESS)
        .where('user_id', userId)
        .join(`${tableNames.EXPERIMENT} as e`, 'e.id', `${tableNames.USER_ACCESS}.experiment_id`)
        .leftJoin(`${tableNames.METADATA_TRACK} as m`, 'e.id', 'm.experiment_id')
        .as('mainQuery');
    }

    const result = await collapseKeyIntoArray(mainQuery, [...fields], 'key', 'metadataKeys', this.sql);

    return result;
  }

  async getExperimentData(experimentId) {
    function mainQuery() {
      this.select('*')
        .from(tableNames.EXPERIMENT)
        .leftJoin(tableNames.EXPERIMENT_EXECUTION, `${tableNames.EXPERIMENT}.id`, `${tableNames.EXPERIMENT_EXECUTION}.experiment_id`)
        .where('id', experimentId)
        .as('mainQuery');
    }

    const experimentExecutionFields = [
      'params_hash', 'state_machine_arn', 'execution_arn',
    ];

    const pipelineExecutionKeys = experimentExecutionFields.reduce((acum, current) => {
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

    const result = await this.sql
      .select([
        ...experimentFields,
        this.sql.raw(
          `${replaceNullsWithObject(
            `jsonb_object_agg(pipeline_type, jsonb_build_object(${pipelineExecutionKeys.join(', ')}))`,
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
  }

  // Get all users and their access for this experiment
  async getUsers(experimentId) {
    const experimentsAccess = await this.sql.select('*')
      .from(tableNames.USER_ACCESS)
      .where('experiment_id', experimentId);

    if (_.isEmpty(experimentsAccess)) {
      throw new NotFoundError('Experiment not found');
    }

    // Remove admin from user list
    const filteredAccess = experimentsAccess.filter(
      ({ accessRole }) => accessRole !== AccessRole.ADMIN,
    );

    const requests = filteredAccess.map(
      async (entry) => getAwsUserAttributesByEmail(entry.userId),
    );

    const cognitoUserData = await Promise.all(requests);

    const experimentUsers = cognitoUserData.map((userInfo, idx) => {
      const email = userInfo.find((attr) => attr.Name === 'email').Value;
      const name = userInfo.find((attr) => attr.Name === 'name').Value;
      const { accessRole } = experimentsAccess[idx];

      return {
        name, email, role: accessRole,
      };
    });

    return experimentUsers;
  }

  // Sets samples_order as an array that has the sample in oldPosition moved to newPosition
  async updateSamplePosition(
    experimentId, oldPosition, newPosition,
  ) {
    const trx = await this.sql.transaction();

    try {
      const result = await trx(tableNames.EXPERIMENT)
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
    await this.sql(tableNames.EXPERIMENT)
      .update({
        samples_order: this.sql.raw(`samples_order || '["${sampleId}"]'::jsonb`),
      })
      .where('id', experimentId);
  }

  async deleteSample(experimentId, sampleId) {
    await this.sql(tableNames.EXPERIMENT)
      .update({
        samples_order: this.sql.raw(`samples_order - '${sampleId}'`),
      })
      .where('id', experimentId);
  }
}

module.exports = Experiment;
