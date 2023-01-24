const MetadataTrack = require('../model/MetadataTrack');

const getLogger = require('../../utils/getLogger');
const { OK, NotFoundError, BadRequestError } = require('../../utils/responses');
const Sample = require('../model/Sample');

const logger = getLogger('[MetadataTrackController] - ');

const createMetadataTrack = async (req, res) => {
  const {
    params: { experimentId, metadataTrackKey },
  } = req;

  logger.log(`Creating metadata track ${metadataTrackKey} in experiment ${experimentId}`);

  await new MetadataTrack().createNewMetadataTrack(experimentId, metadataTrackKey);

  logger.log(`Finished creating metadata track ${metadataTrackKey} in experiment ${experimentId}`);

  res.json(OK());
};

const patchMetadataTrack = async (req, res) => {
  const {
    params: { experimentId, metadataTrackKey: oldKey },
    body: { key },
  } = req;

  logger.log(`Patching metadata track ${oldKey} in experiment ${experimentId}`);

  const result = await new MetadataTrack()
    .update({ experiment_id: experimentId, key: oldKey }, { key });

  if (result.length === 0) {
    throw new NotFoundError(`Metadata track ${oldKey} not found`);
  }

  logger.log(`Finished patching metadata track ${oldKey} in experiment ${experimentId}, changed to ${key}`);
  res.json(OK());
};

const deleteMetadataTrack = async (req, res) => {
  const {
    params: { experimentId, metadataTrackKey },
  } = req;

  logger.log(`Creating metadata track ${metadataTrackKey} in experiment ${experimentId}`);

  const result = await new MetadataTrack().delete(
    { experiment_id: experimentId, key: metadataTrackKey },
  );

  if (result.length === 0) {
    throw new NotFoundError(`Metadata track ${metadataTrackKey} not found`);
  }

  logger.log(`Finished creating metadata track ${metadataTrackKey} in experiment ${experimentId}`);

  res.json(OK());
};

const patchValueForSample = async (req, res) => {
  const {
    params: { experimentId, sampleId, metadataTrackKey },
    body: { value },
  } = req;

  logger.log(`Patching value of metadata track ${metadataTrackKey} in sample ${sampleId} in experiment ${experimentId}`);

  await new MetadataTrack().patchValueForSample(experimentId, sampleId, metadataTrackKey, value);

  logger.log(`Finished patching value of metadata track ${metadataTrackKey} in sample ${sampleId} in experiment ${experimentId}, changed to ${value}`);
  res.json(OK());
};

// parseMetadataFromTSV takes a TSV file with tag-value format like:
// sample1\tmetadata_key_1\tmetadata_value_1\n...
// and turns it into an array like:
// [{sampleId: sample1, metadataKey: key1, metadataValue: value1}, ...]
// sampleNameToId is used to converte the sample names into sample IDs
const parseMetadataFromTSV = (data, sampleNameToId) => {
  let wrongSamplesFound = false;
  const result = data.split('\n').map((line) => {
    const [sampleName, metadataKey, metadataValue] = line.split('\t');
    if (!(sampleName in sampleNameToId)) {
      wrongSamplesFound = true;
    }
    return { sampleId: sampleNameToId[sampleName], metadataKey, metadataValue };
  });

  if (wrongSamplesFound) throw new BadRequestError();
  return result;
};

const buildSampleNameToIdMap = async (experimentId) => {
  const sampleNameToId = {};
  const samples = await new Sample().find({ experiment_id: experimentId });
  samples.forEach((sample) => {
    sampleNameToId[sample.name] = sample.id;
  });
  return sampleNameToId;
};

const createMetadataFromFile = async (req, res) => {
  const { experimentId } = req.params;

  const sampleNameToId = await buildSampleNameToIdMap(experimentId);
  const data = parseMetadataFromTSV(req.body, sampleNameToId);

  try {
    await new MetadataTrack().bulkUpdateMetadata(experimentId, data);
    res.json(OK());
  } catch (error) {
    throw new Error(error.message);
  }
};

module.exports = {
  createMetadataTrack,
  patchMetadataTrack,
  deleteMetadataTrack,
  patchValueForSample,
  createMetadataFromFile,
};
