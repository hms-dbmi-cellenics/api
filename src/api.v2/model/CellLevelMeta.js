const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');
const tableNames = require('./tableNames');
const bucketNames = require('../../config/bucketNames');
const { getSignedUrl } = require('../helpers/s3/signedUrl');

const fields = [
  'id',
  'name',
  'upload_status',
  'created_at',
  'size',
];

class CellLevelMeta extends BasicModel {
  constructor(sql = sqlClient.get()) {
    super(sql, tableNames.CELL_LEVEL_META, fields);
    this.bucketName = bucketNames.CELL_LEVEL_META;
  }

  async getMetadataByExperimentIds(experimentIds) {
    const result = await this.sql
      .select([...fields, `${tableNames.CELL_LEVEL_META_TO_EXPERIMENT_MAP}.experiment_id`])
      .from(tableNames.CELL_LEVEL_META_TO_EXPERIMENT_MAP)
      .leftJoin(
        tableNames.CELL_LEVEL_META,
        `${tableNames.CELL_LEVEL_META_TO_EXPERIMENT_MAP}.cell_metadata_file_id`,
        `${tableNames.CELL_LEVEL_META}.id`,
      )
      .whereIn(`${tableNames.CELL_LEVEL_META_TO_EXPERIMENT_MAP}.experiment_id`, experimentIds);

    return result;
  }

  async getDownloadLink(fileId, fileName) {
    const params = {
      Bucket: this.bucketName,
      Key: fileId,
      ResponseContentDisposition: `attachment; filename ="${fileName}.gz"`,
      Expires: 120,
    };

    const signedUrl = await getSignedUrl('getObject', params);

    return signedUrl;
  }
}

module.exports = CellLevelMeta;
