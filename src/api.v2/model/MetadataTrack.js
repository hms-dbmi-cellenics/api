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

  // createNewMetadataTrack will create a new metadata track and return its ID
  // if the key already exists it will do nothing but return the ID nonetheless
  async createNewMetadataTrack(experimentId, key) {
    const sampleIds = await this.sql.select(['id'])
      .from(tableNames.SAMPLE)
      .where({ experiment_id: experimentId });

    // if track already exists return ID
    const result = await this.findOne({ experiment_id: experimentId, key });
    if (result) {
      return { id: result.id, key: result.key };
    }

    const id = await this.sql.transaction(async (trx) => {
      const response = await trx
        .insert({
          experiment_id: experimentId,
          key,
        })
        .returning(['id'])
        .into(this.tableName);

      const [{ id: metadataTrackId }] = response;


      if (sampleIds.length > 0) {
        const valuesToInsert = sampleIds.map(({ id: sampleId }) => ({
          metadata_track_id: metadataTrackId,
          sample_id: sampleId,
        }));

        await trx(tableNames.SAMPLE_IN_METADATA_TRACK_MAP).insert(valuesToInsert);
      }
      return metadataTrackId;
    });

    return { id, key };
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

  // bulkUpdateMetadata will take data with the format:
  // [{sampleId: sample1, metadataKey: key1, metadataValue: value1}, ...]
  // and will:
  // * create any missing metadata keys (with default value)
  // * insert the provided values for each key (replacing existing values)
  async bulkUpdateMetadata(experimentId, data) {
    // first create all the metadata columns (if any exist it won't be replaced)
    const metadataKeys = [...new Set(data.map(((el) => el.metadataKey)))];
    const createKeysPromises = metadataKeys.map(
      async (key) => this.createNewMetadataTrack(experimentId, key),
    );
    const result = await Promise.all(createKeysPromises);

    // we need a mapping of metadata key -> ID to insert the values
    const trackKeyToId = {};
    result.forEach((track) => {
      trackKeyToId[track.key] = track.id;
    });

    // create the final data to be inserted as rows with
    // the sample_id, metadata_track_id, and value
    const fieldsToInsert = data.map((element) => (
      {
        sample_id: element.sampleId,
        metadata_track_id: trackKeyToId[element.metadataKey],
        value: element.metadataValue,
      }));

    await this.sql(tableNames.SAMPLE_IN_METADATA_TRACK_MAP)
      .insert(fieldsToInsert)
      .onConflict(['metadata_track_id', 'sample_id'])
      .merge('value');
  }
}

module.exports = MetadataTrack;
