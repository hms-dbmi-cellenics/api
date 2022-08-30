const _ = require('lodash');
const { v4: uuidv4 } = require('uuid');

const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');
const { collapseKeyIntoArray, replaceNullsWithObject } = require('../../sql/helpers');

const { NotFoundError, BadRequestError } = require('../../utils/responses');
const tableNames = require('./tableNames');
const config = require('../../config');

const getLogger = require('../../utils/getLogger');
const bucketNames = require('../helpers/s3/bucketNames');
const { getSignedUrl } = require('../../utils/aws/s3');
const constants = require('../../utils/constants');

const logger = getLogger('[ExperimentModel] - ');

const experimentFields = [
  'id',
  'name',
  'description',
  'samples_order',
  'processing_config',
  'notify_by_email',
  'pipeline_version',
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
      'pipeline_version',
      'created_at',
      'updated_at',
    ];

    const aliasedExperimentFields = fields.map((field) => `e.${field}`);

    const mainQuery = this.sql
      .select([...aliasedExperimentFields, 'm.key'])
      .from(tableNames.USER_ACCESS)
      .where('user_id', userId)
      .join(`${tableNames.EXPERIMENT} as e`, 'e.id', `${tableNames.USER_ACCESS}.experiment_id`)
      .leftJoin(`${tableNames.METADATA_TRACK} as m`, 'e.id', 'm.experiment_id')
      .as('mainQuery');

    const result = await collapseKeyIntoArray(
      mainQuery,
      [...fields],
      'key',
      'metadataKeys',
      this.sql,
    );

    return result;
  }


  async getExampleExperiments() {
    return this.getAllExperiments(constants.PUBLIC_ACCESS_ID);
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

  async createCopy(fromExperimentId, name = null) {
    const toExperimentId = uuidv4();

    const { sql } = this;

    await sql
      .insert(
        sql(tableNames.EXPERIMENT)
          .select(
            sql.raw('? as id', [toExperimentId]),
            // Clone the original name if no new name is provided
            name ? sql.raw('? as name', [name]) : 'name',
            'description',
          )
          .where({ id: fromExperimentId }),
      )
      .into(sql.raw(`${tableNames.EXPERIMENT} (id, name, description)`));

    return toExperimentId;
  }

  // Sets samples_order as an array that has the sample in oldPosition moved to newPosition
  async updateSamplePosition(
    experimentId, oldPosition, newPosition,
  ) {
    // If we are working within a transaction then
    // keep using that one instead of starting a subtransaction
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

  async getProcessingConfig(experimentId) {
    const result = await this.findOne({ id: experimentId });
    if (_.isEmpty(result)) {
      throw new NotFoundError('Experiment not found');
    }

    return result.processingConfig;
  }

  async updateProcessingConfig(experimentId, body) {
    const { name: stepName, body: change } = body[0];
    const updateString = JSON.stringify({ [stepName]: change });

    await this.sql(tableNames.EXPERIMENT)
      .update({
        processing_config: this.sql.raw(`processing_config || '${updateString}'::jsonb`),
      }).where('id', experimentId);
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

  /* eslint-disable class-methods-use-this */
  async getDownloadLink(experimentId, downloadType) {
    let downloadedFileName;
    const { clusterEnv } = config;

    const filenamePrefix = experimentId.split('-')[0];
    const requestedBucketName = `${downloadType}-${clusterEnv}-${config.awsAccountId}`;
    const objectKey = `${experimentId}/r.rds`;

    switch (requestedBucketName) {
      case bucketNames.PROCESSED_MATRIX:
        downloadedFileName = `${filenamePrefix}_processed_matrix.rds`;
        break;
      case bucketNames.RAW_SEURAT:
        downloadedFileName = `${filenamePrefix}_raw_matrix.rds`;
        break;
      default:
        throw new BadRequestError('Invalid download type requested');
    }

    const params = {
      Bucket: requestedBucketName,
      Key: objectKey,
      ResponseContentDisposition: `attachment; filename ="${downloadedFileName}"`,
      Expires: 120,
    };

    const signedUrl = getSignedUrl('getObject', params);

    return signedUrl;
  }
}

module.exports = Experiment;
