const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');

const validateRequest = require('../../utils/schema-validator');

const tableNames = require('./tableNames');
const bucketNames = require('../helpers/s3/bucketNames');
const getObject = require('../helpers/s3/getObject');

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
    const {
      s3DataKey,
      config: plotConfig,
    } = await this.findOne({ id: plotUuid, experiment_id: experimentId });

    const result = { config: plotConfig };


    if (s3DataKey) {
      const plotDataObject = await getObject({
        Bucket: bucketNames.PLOTS,
        Key: s3DataKey,
      });

      const output = JSON.parse(plotDataObject);

      if (output.plotData) {
        await validateRequest(output, 'plots-bodies/PlotData.v2.yaml');
      }

      result.plotData = output.plotData || [];
    }

    return result;
  }

  async updateConfig(experimentId, plotUuid, plotConfig) {
    return await this.update({ id: plotUuid, experiment_id: experimentId }, { config: plotConfig });
  }
}

module.exports = Plot;
