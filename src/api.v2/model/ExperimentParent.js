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

  isChild(experimentId) {
    return this.findOne({ experiment_id: experimentId })
      .then((result) => result !== undefined);
  }
}

module.exports = ExperimentParent;
