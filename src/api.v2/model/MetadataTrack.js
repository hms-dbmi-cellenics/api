// @ts-nocheck
const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');

const tableNames = require('./tableNames');
const { NotFoundError } = require('../../utils/responses');

const sampleFields = [
  'id',
  'experiment_id',
  'key',
];

class MetadataTrack extends BasicModel {
  constructor(sql = sqlClient.get()) {
    super(sql, tableNames.METADATA_TRACK, sampleFields);
  }

  async createNewMetadataTrack(experimentId, key) {
    const sampleIds = await this.sql.select(['id'])
      .from(tableNames.SAMPLE)
      .where({ experiment_id: experimentId });

    await this.sql.transaction(async (trx) => {
      const response = await trx
        .insert({
          experiment_id: experimentId,
          key,
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
      }));

      await trx(tableNames.SAMPLE_IN_METADATA_TRACK_MAP).insert(valuesToInsert);
    });
  }

  async createNewSamplesValues(experimentId, sampleIds) {
    const tracks = await this.sql.select(['id'])
      .from(tableNames.METADATA_TRACK)
      .where({ experiment_id: experimentId });

    if (tracks.length === 0) {
      return;
    }

    const valuesToInsert = sampleIds.map((sampleId) => (
      tracks.map(({ id }) => ({
        metadata_track_id: id,
        sample_id: sampleId,
      }))
    )).flat();

    await this.sql(tableNames.SAMPLE_IN_METADATA_TRACK_MAP).insert(valuesToInsert);
  }

  async patchValueForSample(experimentId, sampleId, key, value) {
    const [{ id }] = await this.find({ experiment_id: experimentId, key });

    const result = await this.sql(tableNames.SAMPLE_IN_METADATA_TRACK_MAP)
      .update({ value })
      .where({ metadata_track_id: id, sample_id: sampleId })
      .returning(['metadata_track_id']);

    if (result.length === 0) {
      throw new NotFoundError(`Metadata track ${key} or sample ${sampleId} don't exist`);
    }
  }
}

module.exports = MetadataTrack;
