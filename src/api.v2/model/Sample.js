const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');

const sampleTable = 'sample';
const sampleFields = [
  'id',
  'experiment_id',
  'name',
  'sample_technology',
  'created_at',
  'updated_at',
];

class Sample extends BasicModel {
  constructor(sql = sqlClient.get()) {
    super(sql, sampleTable, sampleFields);
  }
}

module.exports = Sample;
