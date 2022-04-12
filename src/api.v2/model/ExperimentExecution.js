const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');

const tableNames = require('../helpers/tableNames');

const selectableProps = [
  'experiment_id', 'pipeline_type',
  'params_hash', 'state_machine_arn', 'execution_arn',
];

class ExperimentExecution extends BasicModel {
  constructor(sql = sqlClient.get()) {
    super(sql, tableNames.EXPERIMENT_EXECUTION, selectableProps);
  }
}

module.exports = ExperimentExecution;
