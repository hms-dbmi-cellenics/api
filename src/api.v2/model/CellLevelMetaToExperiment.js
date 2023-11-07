const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');
const tableNames = require('./tableNames');

const fields = [
  'experiment_id',
  'cell_metadata_file_id',
];

class CellLevelMetaToExperiment extends BasicModel {
  constructor(sql = sqlClient.get()) {
    super(sql, tableNames.CELL_LEVEL_META_TO_EXPERIMENT_MAP, fields);
  }

  async setNewFile(experimentId, cellMetadataFileId) {
    // Remove references to previous file
    await this.delete({ experiment_id: experimentId });
    await this.create({
      experiment_id: experimentId,
      cell_metadata_file_id: cellMetadataFileId,
    });
  }
}

module.exports = CellLevelMetaToExperiment;
