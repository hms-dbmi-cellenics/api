const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');

const tableNames = require('./tableNames');

const selectableProps = [
  'experiment_id', 'pipeline_type', 'state_machine_arn', 'execution_arn',
  'last_status_response', 'last_gem2s_params',
];

class ExperimentExecution extends BasicModel {
  constructor(sql = sqlClient.get()) {
    super(sql, tableNames.EXPERIMENT_EXECUTION, selectableProps, ['metadata']);
  }
}

module.exports = ExperimentExecution;
