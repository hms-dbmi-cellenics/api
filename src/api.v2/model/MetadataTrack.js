// @ts-nocheck
const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');

const metadataTrackTable = 'metadata_track';
const sampleInMetadataTrackTable = 'sample_in_metadata_track_map';
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
    super(sql, metadataTrackTable, sampleFields);
  }

  async createNewSampleValues(experimentId, sampleId) {
    const tracks = await this.sql.select(['id'])
      .from(metadataTrackTable)
      .where({ experiment_id: experimentId });

    if (tracks.length === 0) {
      return;
    }

    const valuesToInsert = tracks.map(({ id }) => ({
      metadata_track_id: id,
      sample_id: sampleId,
      value: 'N.A.',
    }));

    await this.sql(sampleInMetadataTrackTable)
      .insert(valuesToInsert);
  }
}

module.exports = MetadataTrack;
