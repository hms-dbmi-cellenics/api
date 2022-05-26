const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');

const { replaceNullsWithObject } = require('../../sql/helpers');
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

  async getSamples(experimentId) {
    const { sql } = this;

    const metadataObject = `${replaceNullsWithObject('jsonb_object_agg(key, value)', 'key')} as metadata`;

    const sampleFieldsWithAlias = sampleFields.map((field) => `s.${field}`);

    const metadataQuery = sql.select([...sampleFields, sql.raw(metadataObject)])
      .from(sql.select([...sampleFieldsWithAlias, 'm.key', 'sm_map.value'])
        .from({ s: tableNames.SAMPLE })
        .leftJoin(`${tableNames.METADATA_TRACK} as m`, 's.experiment_id', 'm.experiment_id')
        .leftJoin(`${tableNames.SAMPLE_IN_METADATA_TRACK_MAP} as sm_map`, { 's.id': 'sm_map.sample_id', 'm.id': 'sm_map.metadata_track_id' })
        .where('s.experiment_id', experimentId)
        .as('mainQuery'))
      .groupBy(sampleFields)
      .as('select_metadata');

    const sampleFileFields = ['sample_file_type', 'size', 'upload_status', 's3_path'];
    const sampleFileFieldsWithAlias = sampleFileFields.map((field) => `sf.${field}`);
    const fileObjectFormatted = sampleFileFields.map((field) => [`'${field}'`, field]);
    const sampleFileObject = `jsonb_object_agg(sample_file_type,json_build_object(${fileObjectFormatted})) as files`;
    const fileNamesQuery = sql.select(['id', sql.raw(sampleFileObject)])
      .from(sql.select([...sampleFileFieldsWithAlias, 's.id'])
        .from({ s: tableNames.SAMPLE })
        .join(`${tableNames.SAMPLE_TO_SAMPLE_FILE_MAP} as sf_map`, 's.id', 'sf_map.sample_id')
        .join(`${tableNames.SAMPLE_FILE} as sf`, 'sf.id', 'sf_map.sample_file_id')
        .where('s.experiment_id', experimentId)
        .as('mainQuery'))
      .groupBy('id')
      .as('select_sample_file');

    const result = await this.sql.select('*')
      .queryContext({ camelCaseExceptions: ['metadata'] })
      .from(metadataQuery)
      .join(fileNamesQuery, 'select_metadata.id', 'select_sample_file.id');

    return result;
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
