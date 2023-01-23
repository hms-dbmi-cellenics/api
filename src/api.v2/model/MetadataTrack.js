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

  // TODO rename to upsertNewMetadataTrack
  async createNewMetadataTrack(experimentId, key) {
    console.log('experiment, key', experimentId, key);
    const sampleIds = await this.sql.select(['id'])
      .from(tableNames.SAMPLE)
      .where({ experiment_id: experimentId });


    // if track already exists return
    const result = await this.findOne({ experiment_id: experimentId, key });
    console.log('result: ', result);
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

    console.log('id returned: ', id);
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

  // data looks like:
  // [{sampleId: sample1, metadataKey: key1, metadataValue: value1}, ...]

  async bulkUpdateMetadata(experimentId, data) {
    console.log('data ', data);
    const metadataKeys = [...new Set(data.map(((el) => el.metadataKey)))];
    console.log('metadataKeys: ', metadataKeys);

    // const [{ id }] = await this.find({ experiment_id: experimentId, key: metadataKeys[0] });
    // console.log('result ', id);
    const createKeysPromises = metadataKeys.map(
      async (key) => this.createNewMetadataTrack(experimentId, key),
    );
    const result = await Promise.all(createKeysPromises);

    console.log('created tracks', result);
    // console.log('metadataTrackIds', metadataTrackIds);

    // const metaIds = await this.sql.select(['id', 'key'])
    //   .from(tableNames.METADATA_TRACK)
    //   .where({ experiment_id: experimentId });

    const trackKeyToId = {};
    result.forEach((track) => {
      trackKeyToId[track.key] = track.id;
    });
    // TODO need to retrieve the metadata key Ids to build this
    // const tracks = await this.sql.select(['id'])
    //   .from(tableNames.METADATA_TRACK)
    //   .where({ experiment_id: experimentId });


    console.log('trackKeyToId', trackKeyToId);
    const fieldsToInsert = data.map((element) => (
      {
        sample_id: element.sampleId,
        metadata_track_id: trackKeyToId[element.metadataKey],
        value: element.metadataValue,
      }));

    console.log('fieldsToInsert', fieldsToInsert);

    await this.sql(tableNames.SAMPLE_IN_METADATA_TRACK_MAP)
      .insert(fieldsToInsert)
      .onConflict(['metadata_track_id', 'sample_id'])
      .merge('value');
    // const promises = data.map(async (element) => {
    //   const { sampleId, metadataKey, metadataValue } = element;
    //   // Patch value for sample
    //   await this.patchValueForSample(experimentId, sampleId, metadataKey, metadataValue);
    // });
    // await Promise.all(promises);
  }
}

module.exports = MetadataTrack;
