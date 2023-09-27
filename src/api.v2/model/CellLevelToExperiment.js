const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');
const tableNames = require('./tableNames');

const fields = [
  'experiment_id',
  'cell_metadata_file_id',
];

class CellLevelToExperiment extends BasicModel {
  constructor(sql = sqlClient.get()) {
    super(sql, tableNames.CELL_LEVEL_TO_EXPERIMENT_MAP, fields);
  }
}

module.exports = CellLevelToExperiment;
