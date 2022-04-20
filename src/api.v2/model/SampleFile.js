const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');

const tableNames = require('./tableNames');

const sampleFields = [
  'id',
  'sample_file_type',
  'valid',
  'size',
  's3_path',
  'upload_status',
  'updated_at',
];

class SampleFile extends BasicModel {
  constructor(sql = sqlClient.get()) {
    super(sql, tableNames.SAMPLE_FILE, sampleFields);
  }
}

module.exports = SampleFile;
