// @ts-nocheck
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

class MetadataTrack extends BasicModel {
  constructor(sql = sqlClient.get()) {
    super(sql, tableNames.METADATA_TRACK, sampleFields);
  }

  async createNewSampleValues(experimentId, sampleId) {
    const tracks = await this.sql.select(['id'])
      .from(tableNames.METADATA_TRACK)
      .where({ experiment_id: experimentId });

    if (tracks.length === 0) {
      return;
    }

    const valuesToInsert = tracks.map(({ id }) => ({
      metadata_track_id: id,
      sample_id: sampleId,
      value: 'N.A.',
    }));

    await this.sql(tableNames.SAMPLE_IN_METADATA_TRACK_MAP)
      .insert(valuesToInsert);
  }
}

module.exports = MetadataTrack;
