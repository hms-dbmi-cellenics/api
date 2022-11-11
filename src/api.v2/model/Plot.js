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

  async getConfig(experimentId, plotUuid) {
    const result = await this.findOne({ id: plotUuid, experiment_id: experimentId });

    if (_.isNil(result)) {
      throw new NotFoundError(`Plot ${plotUuid} in experiment ${experimentId} not found`);
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

  async updateConfig(experimentId, plotUuid, plotConfig) {
    return await this.upsert({ id: plotUuid, experiment_id: experimentId }, { config: plotConfig });
  }

  async invalidateAttributes(experimentId, plotUuid, invalidatedKeys) {
    let newConfig;

    await this.sql.transaction(async (trx) => {
      const plot = await trx(tableNames.PLOT)
        .select(['config'])
        .where({ id: plotUuid, experiment_id: experimentId })
        .first();

      if (_.isNil(plot)) {
        logger.log(`Experiment ${experimentId}, plot ${plotUuid}. No config stored so skipping invalidation.`);
        return;
      }

      const { config } = plot;

      invalidatedKeys.forEach((key) => {
        delete config[key];
      });

      const results = await trx(tableNames.PLOT)
        .update({ config })
        .where({ id: plotUuid, experiment_id: experimentId })
        .returning(['config']);

      newConfig = results[0].config;
    });

    return newConfig;
  }
}

module.exports = Plot;
