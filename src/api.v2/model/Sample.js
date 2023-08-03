const _ = require('lodash');

const { v4: uuidv4 } = require('uuid');

const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');

const { replaceNullsWithObject } = require('../../sql/helpers');
const tableNames = require('./tableNames');

const getLogger = require('../../utils/getLogger');

const logger = getLogger('[SampleModel] - ');

const sampleFields = [
  'id',
  'experiment_id',
  'name',
  'sample_technology',
  'options',
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

    // Add sample file id (needs to go separate to avoid conflict with sample id)
    sampleFileFieldsWithAlias.push('sf.id as sf_id');
    fileObjectFormatted.push(['\'id\'', 'sf_id']);

    const sampleFileObject = `${replaceNullsWithObject(`jsonb_object_agg(sample_file_type,json_build_object(${fileObjectFormatted}))`, 'sample_file_type')} as files`;
    const fileNamesQuery = sql.select(['id', sql.raw(sampleFileObject)])
      .from(sql.select([...sampleFileFieldsWithAlias, 's.id'])
        .from({ s: tableNames.SAMPLE })
        .leftJoin(`${tableNames.SAMPLE_TO_SAMPLE_FILE_MAP} as sf_map`, 's.id', 'sf_map.sample_id')
        .leftJoin(`${tableNames.SAMPLE_FILE} as sf`, 'sf.id', 'sf_map.sample_file_id')
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

  async updateOption(experimentId, options) {
    await this.sql(tableNames.SAMPLE)
      .update({
        options: this.sql.raw(`'${JSON.stringify(options)}'::jsonb`),
      })
      .where({ experiment_id: experimentId });
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

  /**
   * Copies samples from one experiment to another one
   *
   * @param {*} fromExperimentId
   * @param {*} toExperimentId
   * @param {*} sampleIdsMapInput If null, we should copy all the samples over
   */
  async copyTo(fromExperimentId, toExperimentId, samplesOrder, sampleIdsMapInput = null) {
    if (samplesOrder.length === 0) {
      logger.log(`samplesOrder is defined but empty when copying from experiment ${fromExperimentId} to ${toExperimentId}`);
      return [];
    }

    let sampleIdsMap = sampleIdsMapInput;

    // Make sure the new sample ids mapping sort() order matches the old one,
    // this is necessary to make sure shouldGem2sRerun still produces the same results
    if (sampleIdsMap === null) {
      const sortedSamplesOrder = [...samplesOrder].sort();
      const newSortedSamplesOrder = _.times(samplesOrder.length, uuidv4).sort();

      sampleIdsMap = _.zipObject(sortedSamplesOrder, newSortedSamplesOrder);
    }

    const fromSamples = await this.getSamples(fromExperimentId);

    const newSampleIds = [];

    const metadataTrackKeys = Object.keys(fromSamples[0].metadata);

    const sampleRows = [];
    const sampleFileMapRows = [];
    const metadataValueMapRows = [];

    await this.sql.transaction(async (trx) => {
      let metadataTracks = [];
      if (metadataTrackKeys.length > 0) {
        metadataTracks = await trx(tableNames.METADATA_TRACK)
          .insert(metadataTrackKeys.map((key) => ({ experiment_id: toExperimentId, key })))
          .returning(['id', 'key']);
      }

      // Copy each sample in order so
      // the new samples we create follow the same order
      samplesOrder.forEach((fromSampleId) => {
        const sample = fromSamples.find(({ id }) => id === fromSampleId);

        const toSampleId = sampleIdsMap[fromSampleId];

        newSampleIds.push(toSampleId);

        sampleRows.push({
          id: toSampleId,
          experiment_id: toExperimentId,
          name: sample.name,
          sample_technology: sample.sampleTechnology,
        });

        Object.entries(sample.files).forEach(([, file]) => {
          sampleFileMapRows.push({
            sample_id: toSampleId,
            sample_file_id: file.id,
          });
        });

        Object.entries(sample.metadata).forEach(([key, value]) => {
          const { id } = _.find(metadataTracks, ({ key: currentKey }) => currentKey === key);
          metadataValueMapRows.push({ metadata_track_id: id, sample_id: toSampleId, value });
        });
      });

      await trx(tableNames.SAMPLE).insert(sampleRows);
      await trx(tableNames.SAMPLE_TO_SAMPLE_FILE_MAP).insert(sampleFileMapRows);

      if (metadataValueMapRows.length > 0) {
        await trx(tableNames.SAMPLE_IN_METADATA_TRACK_MAP).insert(metadataValueMapRows);
      }
    });

    return newSampleIds;
  }
}

module.exports = Sample;
