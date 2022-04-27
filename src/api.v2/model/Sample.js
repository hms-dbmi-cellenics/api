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

    const fieldsWithMetadata = [...sampleFields, sql.raw(
      `${replaceNullsWithObject('jsonb_object_agg(key, value)', 'key')} as metadata`,
    )];
    const sampleFieldsWithAlias = sampleFields.map((field) => `s.${field}`);

    const metadataQuery = sql.select(fieldsWithMetadata)
      .from(sql.select([...sampleFieldsWithAlias, 'm.key', 'sm_map.value'])
        .from({ s: tableNames.SAMPLE })
        .leftJoin(`${tableNames.METADATA_TRACK} as m`, 's.experiment_id', 'm.experiment_id')
        .leftJoin(`${tableNames.SAMPLE_IN_METADATA_TRACK_MAP} as sm_map`, 's.id', 'sm_map.sample_id')
        .where('s.experiment_id', experimentId)
        .as('mainQuery'))
      .groupBy(sampleFields)
      .as('select_metadata');

    const sampleFileFields = ['sample_file_type', 's3_path', 'size', 'valid', 'upload_status'];
    const sampleFileFieldsWithAlias = sampleFileFields.map((field) => `sf.${field}`);
    const fileObjectFormatted = sampleFileFields.map((field) => [`'${field}'`, field]);

    const fileNamesQuery = sql.select(['id', sql.raw(
      `jsonb_object_agg(sample_file_type,json_build_object(${fileObjectFormatted})) as files`,
    )])
      .from(sql.select([...sampleFileFieldsWithAlias, 's.id'])
        .from({ s: tableNames.SAMPLE })
        .join(`${tableNames.SAMPLE_TO_SAMPLE_FILE} as sf_map`, 's.id', 'sf_map.sample_id')
        .join(`${tableNames.SAMPLE_FILE} as sf`, 'sf.id', 'sf_map.sample_file_id')
        .where('s.experiment_id', experimentId)
        .as('mainQuery'))
      .groupBy('id')
      .as('select_sample_file');

    const result = await this.sql.select('*')
      .from(metadataQuery)
      .join(fileNamesQuery, 'select_metadata.id', 'select_sample_file.id');

    return result;
  }
}

module.exports = Sample;
