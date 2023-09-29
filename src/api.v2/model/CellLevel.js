const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');
const tableNames = require('./tableNames');

const fields = [
  'id',
  'name',
  'upload_status',
  'created_at',
];

class CellLevel extends BasicModel {
  constructor(sql = sqlClient.get()) {
    super(sql, tableNames.CELL_LEVEL, fields);
  }

  async getMetadataByExperimentId(experimentId) {
    const result = await this.sql
      .select(fields)
      .from(tableNames.CELL_LEVEL_TO_EXPERIMENT_MAP)
      .leftJoin(
        tableNames.CELL_LEVEL,
        `${tableNames.CELL_LEVEL_TO_EXPERIMENT_MAP}.cell_metadata_file_id`,
        `${tableNames.CELL_LEVEL}.id`,
      ) // Join with cell_metadata_file table
      .where(`${tableNames.CELL_LEVEL_TO_EXPERIMENT_MAP}.experiment_id`, experimentId)
      .first();

    return result;
  }
}

module.exports = CellLevel;
