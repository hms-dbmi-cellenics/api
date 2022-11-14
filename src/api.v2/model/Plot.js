/* eslint-disable no-param-reassign */
const _ = require('lodash');

const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');

const validateRequest = require('../../utils/schema-validator');

const tableNames = require('./tableNames');
const bucketNames = require('../../config/bucketNames');
const getObject = require('../helpers/s3/getObject');
const { NotFoundError } = require('../../utils/responses');
const getLogger = require('../../utils/getLogger');

const logger = getLogger('[PlotModel] - ');

const selectableProps = [
  'id',
  'experiment_id',
  'config',
  's3_data_key',
];

class Plot extends BasicModel {
  constructor(sql = sqlClient.get()) {
    super(sql, tableNames.PLOT, selectableProps);
  }

  async getConfig(experimentId, plotId) {
    const result = await this.findOne({ id: plotId, experiment_id: experimentId });

    if (_.isNil(result)) {
      throw new NotFoundError(`Plot ${plotId} in experiment ${experimentId} not found`);
    }

    const { s3DataKey = null, config: plotConfig } = result;

    const response = { config: plotConfig };

    if (s3DataKey) {
      const plotDataObject = await getObject({
        Bucket: bucketNames.PLOTS,
        Key: s3DataKey,
      });

      const output = JSON.parse(plotDataObject);

      if (output.plotData) {
        await validateRequest(output, 'plots-bodies/PlotData.v2.yaml');
      }

      response.plotData = output.plotData || [];
    }

    return response;
  }

  async updateConfig(experimentId, plotId, plotConfig) {
    return await this.upsert({ id: plotId, experiment_id: experimentId }, { config: plotConfig });
  }

  async invalidateAttributesForMatches(experimentId, plotIdMatcher, invalidatedKeys) {
    let newConfigs;

    await this.sql.transaction(async (trx) => {
      const results = await trx(tableNames.PLOT)
        .select(['id', 'config'])
        .where({ experiment_id: experimentId })
        .andWhereLike('id', plotIdMatcher);

      const updatedConfigs = await Promise.all(results.map(async ({ id, config }) => {
        invalidatedKeys.forEach((key) => {
          delete config[key];
        });

        const [updateResult] = await trx(tableNames.PLOT)
          .update({ config })
          .where({ id, experiment_id: experimentId })
          .returning(['id', 'config']);

        return updateResult;
      }));

      newConfigs = updatedConfigs;
    });

    return newConfigs;
  }

  async invalidateAttributes(experimentId, plotId, invalidatedKeys) {
    let newConfig;

    await this.sql.transaction(async (trx) => {
      const result = await trx(tableNames.PLOT)
        .select(['config'])
        .where({ id: plotId, experiment_id: experimentId });

      if (result.length === 0) {
        logger.log(`Experiment ${experimentId}, plot ${plotId}. No config stored so skipping invalidation.`);
        return;
      }

      const { config } = result[0];

      invalidatedKeys.forEach((key) => {
        delete config[key];
      });

      const results = await trx(tableNames.PLOT)
        .update({ config })
        .where({ id: plotId, experiment_id: experimentId })
        .returning(['config']);

      newConfig = results[0].config;
    });

    return newConfig;
  }
}

module.exports = Plot;
