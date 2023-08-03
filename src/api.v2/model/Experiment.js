const _ = require('lodash');
const { v4: uuidv4 } = require('uuid');

const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');
const { collapseKeyIntoArray, replaceNullsWithObject } = require('../../sql/helpers');

const { NotFoundError, BadRequestError } = require('../../utils/responses');
const tableNames = require('./tableNames');
const config = require('../../config');

const getLogger = require('../../utils/getLogger');
const bucketNames = require('../../config/bucketNames');
const { getSignedUrl } = require('../helpers/s3/signedUrl');
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
      .select([
        ...aliasedExperimentFields,
        'm.key',
        'p.parent_experiment_id',
        /*
        The parent_experiment_id could be null in cases where the
        parent experiment has been deleted.
        The existence of a row with the experiment_id in the experiment_parent
         table after doing a leftJoin,
        indicates that it's a subsetted experiment.
        */
        this.sql.raw('CASE WHEN p.experiment_id IS NOT NULL THEN true ELSE false END as is_subsetted'),
      ])
      .from(tableNames.USER_ACCESS)
      .where('user_id', userId)
      .join(`${tableNames.EXPERIMENT} as e`, 'e.id', `${tableNames.USER_ACCESS}.experiment_id`)
      .leftJoin(`${tableNames.METADATA_TRACK} as m`, 'e.id', 'm.experiment_id')
      .leftJoin(`${tableNames.EXPERIMENT_PARENT} as p`, 'e.id', 'p.experiment_id')
      .as('mainQuery');

    const result = await collapseKeyIntoArray(
      mainQuery,
      [...fields, 'parent_experiment_id', 'is_subsetted'],
      'key',
      'metadataKeys',
      this.sql,
    );

    return result;
  }

  async getExampleExperiments() {
    const fields = [
      'id',
      'name',
      'description',
      'publication_title',
      'publication_url',
      'data_source_title',
      'data_source_url',
      'species',
      'cell_count',
    ];

    const aliasedExperimentFields = fields.map((column) => `e.${column}`);

    const result = await this.sql
      .select(aliasedExperimentFields)
      .min('s.sample_technology as sample_technology')
      .count('s.id as sample_count') // Returns a BigInt type which is represented as string (parse?)
      .from(tableNames.USER_ACCESS)
      .join(`${tableNames.EXPERIMENT} as e`, 'e.id', `${tableNames.USER_ACCESS}.experiment_id`)
      .join(`${tableNames.SAMPLE} as s`, 'e.id', 's.experiment_id')
      .where('user_id', constants.PUBLIC_ACCESS_ID)
      .groupBy('e.id');

    return result;
  }

  async getExperimentData(experimentId) {
    function mainQuery() {
      this.select('*')
        .from(tableNames.EXPERIMENT)
        .leftJoin(tableNames.EXPERIMENT_EXECUTION, `${tableNames.EXPERIMENT}.id`, `${tableNames.EXPERIMENT_EXECUTION}.experiment_id`)
        .leftJoin(tableNames.EXPERIMENT_PARENT, `${tableNames.EXPERIMENT}.id`, `${tableNames.EXPERIMENT_PARENT}.experiment_id`)
        .where('id', experimentId)
        .as('mainQuery');
    }

    const experimentExecutionFields = [
      'state_machine_arn', 'execution_arn', 'last_pipeline_params',
    ];

    const pipelineExecutionKeys = experimentExecutionFields.reduce((acum, current) => {
      acum.push(`'${current}'`);
      acum.push(current);

      return acum;
    }, []);

    const result = await this.sql
      .select([
        ...experimentFields,
        'parent_experiment_id',
        this.sql.raw(
          `${replaceNullsWithObject(
            `jsonb_object_agg(pipeline_type, jsonb_build_object(${pipelineExecutionKeys.join(', ')}))`,
            'pipeline_type',
          )} as pipelines`,
        ),
      ])
      .from(mainQuery)
      .groupBy([...experimentFields, 'parent_experiment_id'])
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
            [
              sql.raw('? as id', [toExperimentId]),
              // Clone the original name if no new name is provided
              name ? sql.raw('? as name', [name]) : 'name',
              'description',
              'pod_cpus',
              'pod_memory',
            ],
          )
          .where({ id: fromExperimentId }),
      )
      .into(sql.raw(`${tableNames.EXPERIMENT} (id, name, description, pod_cpus, pod_memory)`));

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

      return samplesOrder;
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

  // try to get specific hardware requirements for running an experiment pipeline
  // return undefined in case of error to use default settings (fargate)
  async getResourceRequirements(experimentId) {
    let podCpus;
    let podMemory;
    try {
      const result = await this.sql
        .select('pod_memory', 'pod_cpus')
        .from(tableNames.EXPERIMENT)
        .where('id', experimentId)
        .first();

      if (_.isEmpty(result)) {
        throw new NotFoundError('Experiment not found');
      }

      if (result.podMemory !== null) podMemory = result.podMemory;
      if (result.podCpus !== null) podCpus = result.podCpus;
    } catch (e) {
      logger.error(`getResoureceRequirements: returning default values: ${e}`);
    }

    return { podCpus, podMemory };
  }

  async updateProcessingConfig(experimentId, changes) {
    const { name: stepName, body: update } = changes[0];
    const updateString = JSON.stringify({ [stepName]: update });

    await this.sql(tableNames.EXPERIMENT)
      .update({
        processing_config: this.sql.raw(`processing_config || '${updateString}'::jsonb`),
      }).where('id', experimentId);
  }

  async addSamples(experimentId, sampleIds) {
    const newSamplesArray = sampleIds
      .map((sampleId) => `"${sampleId}"`)
      .join(', ');

    await this.sql(tableNames.EXPERIMENT)
      .update({
        samples_order: this.sql.raw(`samples_order || '[${newSamplesArray}]'::jsonb`),
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
      default:
        throw new BadRequestError('Invalid download type requested');
    }

    const params = {
      Bucket: requestedBucketName,
      Key: objectKey,
      ResponseContentDisposition: `attachment; filename ="${downloadedFileName}"`,
      Expires: 120,
    };

    const signedUrl = await getSignedUrl('getObject', params);

    return signedUrl;
  }
}

module.exports = Experiment;
