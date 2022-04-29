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
    await this.sql.transaction(async (trx) => {
      // Remove references to previous sample file for sampleFileType (if they exist)
      await trx.del()
        .from({ sf_map: tableNames.SAMPLE_TO_SAMPLE_FILE_MAP })
        .where({ sample_id: sampleId })
        .andWhere(
          'sample_file_id',
          '=',
          trx.select(['id'])
            .from({ sf: tableNames.SAMPLE_FILE })
            .where('sf.id', '=', trx.ref('sf_map.sample_file_id'))
            .andWhere('sf.sample_file_type', '=', sampleFileType),
        );

      // Add new sample file reference
      await trx(tableNames.SAMPLE_TO_SAMPLE_FILE_MAP).insert(
        {
          sample_id: sampleId,
          sample_file_id: sampleFileId,
        },
      );
    });
  }
}

module.exports = Sample;
