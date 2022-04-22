const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');

const tableNames = require('./tableNames');

const sampleFields = [
  'id',
  'sample_file_type',
  'size',
  's3_path',
  'upload_status',
  'updated_at',
];

class SampleFile extends BasicModel {
  constructor(sql = sqlClient.get()) {
    super(sql, tableNames.SAMPLE_FILE, sampleFields);
  }

  async updateUploadStatus(sampleId, sampleFileType, uploadStatus) {
    await this.sql({ sf: tableNames.SAMPLE_FILE })
      .update({ upload_status: uploadStatus })
      .whereExists(
        this.sql({ sf_map: tableNames.SAMPLE_TO_SAMPLE_FILE_MAP })
          .select(['sample_file_id'])
          .where('sf_map.sample_file_id', '=', this.sql.ref('sf.id'))
          .where('sf_map.sample_id', '=', sampleId),
      )
      .andWhere({ sample_file_type: sampleFileType });
  }
}

module.exports = SampleFile;
