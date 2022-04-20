const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');

const tableNames = require('./tableNames');

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
    super(sql, tableNames.SAMPLE, sampleFields);
  }

  async setNewFile(sampleId, sampleFileId, sampleFileType) {
    // Remove references to previous sample file for this type (if they exist)
    await this.sql().delete()
      .from({ sf_map: tableNames.SAMPLE_TO_SAMPLE_FILE_MAP })
      .where({ sample_id: sampleId })
      .andWhere(
        'sample_file_id',
        '=',
        this.sql.select(['id'])
          .from({ sf: tableNames.SAMPLE_FILE })
          .where('sf.id', '=', this.sql.ref('sf_map.sample_file_id'))
          .andWhere('sf.sample_file_type', '=', sampleFileType),
      );

    // Add new sample file
    await this.sql(tableNames.SAMPLE_TO_SAMPLE_FILE_MAP).insert(
      {
        sample_id: sampleId,
        sample_file_id: sampleFileId,
      },
    );
  }
}

module.exports = Sample;
