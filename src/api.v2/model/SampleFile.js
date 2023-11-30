const _ = require('lodash');

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

  async allFilesForSample(sampleId) {
    const sampleFileIdObjects = await this.sql(tableNames.SAMPLE_TO_SAMPLE_FILE_MAP)
      .select('sample_file_id')
      .where({ sample_id: sampleId });

    const sampleFileIds = _.map(sampleFileIdObjects, 'sampleFileId');

    const files = await this.sql(tableNames.SAMPLE_FILE)
      .select()
      .whereIn('id', sampleFileIds);

    return files;
  }

  async updateUploadStatus(sampleFileId, uploadStatus) {
    return this.sql({ sf: tableNames.SAMPLE_FILE })
      .update({ upload_status: uploadStatus })
      .where({ id: sampleFileId });
  }
}

module.exports = SampleFile;
