// @ts-nocheck
const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');

const tableNames = require('./tableNames');

const selectableProps = [
  'experiment_id',
  'parent_experiment_id',
];

class ExperimentParent extends BasicModel {
  constructor(sql = sqlClient.get()) {
    super(sql, tableNames.EXPERIMENT_PARENT, selectableProps);
  }

  async isSubset(experimentId) {
    const entry = await this.findOne({ experiment_id: experimentId });

    return entry !== undefined;
  }

  async copyTo(fromExperimentId, toExperimentId) {
    const { parentExperimentId } = await this.findOne({ experiment_id: fromExperimentId }) || {};

    if (parentExperimentId) {
      await this.create({
        experiment_id: toExperimentId,
        parent_experiment_id: parentExperimentId,
      });
    }
  }
}

module.exports = ExperimentParent;
