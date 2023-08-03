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
    let configsToReturn;

    await this.sql.transaction(async (trx) => {
      const matches = await trx(tableNames.PLOT)
        .select(['id', 'config'])
        .where({ experiment_id: experimentId })
        .andWhereLike('id', plotIdMatcher);

      logger.log(`Plot matcher: ${plotIdMatcher}. Invalidating config for ${matches.length} plots`);

      const updatedConfigs = await Promise.all(matches.map(async ({ id, config }) => {
        invalidatedKeys.forEach((key) => {
          delete config[key];
        });

        const [updatedConfig] = await trx(tableNames.PLOT)
          .update({ config })
          .where({ id, experiment_id: experimentId })
          .returning(['id', 'config']);

        return updatedConfig;
      }));

      configsToReturn = updatedConfigs;
    });

    return configsToReturn;
  }

  async copyTo(fromExperimentId, toExperimentId, sampleIdsMap) {
    const { sql } = this;

    const fromPlots = await sql(tableNames.PLOT)
      .select()
      .where({ experiment_id: fromExperimentId });

    const fromSampleIds = Object.keys(sampleIdsMap);

    const toPlots = fromPlots.map((plot) => {
      const { config, s3DataKey, id: fromPlotId } = plot;

      let toPlotId = fromPlotId;

      // Plot ids we want to change look like this: "{sampleId}-{plotName}-{someNumber}"
      // If it matches, we will swap the sampleId value with the new one
      const fromSampleId = fromSampleIds.find((sampleId) => fromPlotId.includes(sampleId));
      if (fromSampleId !== undefined) {
        toPlotId = fromPlotId.replace(fromSampleId, sampleIdsMap[fromSampleId]);
      }

      const newPlot = {
        id: toPlotId,
        experiment_id: toExperimentId,
        config,
        s3_data_key: s3DataKey,
      };

      return newPlot;
    });


    await sql(tableNames.PLOT).insert(toPlots);
  }
}

module.exports = Plot;
