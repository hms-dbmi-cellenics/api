// @ts-nocheck
const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');

const tableNames = require('./tableNames');

const sampleFields = [
  'id',
  'experiment_id',
  'key',
];

class MetadataTrack extends BasicModel {
  constructor(sql = sqlClient.get()) {
    super(sql, tableNames.METADATA_TRACK, sampleFields);
  }

  async createNewMetadataTrack(experimentId, metadataTrackKey) {
    const sampleIds = await this.sql.select(['id'])
      .from(tableNames.SAMPLE)
      .where({ experiment_id: experimentId });

    await this.sql.transaction(async (trx) => {
      const response = await trx
        .insert({
          experiment_id: experimentId,
          key: metadataTrackKey,
        })
        .returning(['id'])
        .into(this.tableName);

      if (sampleIds.length === 0) {
        return;
      }

      const [{ id: metadataTrackId }] = response;

      const valuesToInsert = sampleIds.map(({ id: sampleId }) => ({
        metadata_track_id: metadataTrackId,
        sample_id: sampleId,
        value: 'N.A.',
      }));

      await trx(tableNames.SAMPLE_IN_METADATA_TRACK_MAP).insert(valuesToInsert);
    });
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

    await this.sql(tableNames.SAMPLE_IN_METADATA_TRACK_MAP).insert(valuesToInsert);
  }
}

module.exports = MetadataTrack;
