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
  const invalidLines = [];
  const invalidSamples = new Set();
  const invalidDuplicates = [];

  const sampleMetadataPairCounts = {};

  const result = data.trim().split('\n').map((line, index) => {
    // check that there are 3 elements per line
    const elements = line.trim().split('\t');
    if (elements.length !== 3) {
      invalidLines.push(index + 1);
    }

    const sampleName = elements[0].trim();
    const metadataKey = elements[1].trim().replace(/\s+/, '_');
    const metadataValue = elements[2].trim();

    // check that the sample name exists in the experiment
    if (!(sampleName in sampleNameToId)) {
      invalidSamples.add(sampleName);
    }

    // Check for multiple metadata assignment to the same sample and track
    if (!Object.prototype.hasOwnProperty.call(sampleMetadataPairCounts, `${sampleName}@${metadataKey}`)) {
      sampleMetadataPairCounts[`${sampleName}@${metadataKey}`] = index + 1;
    } else {
      const duplicateLine = sampleMetadataPairCounts[`${sampleName}@${metadataKey}`];
      invalidDuplicates.push(`${duplicateLine} & ${index + 1}`);
    }

    return { sampleId: sampleNameToId[sampleName], metadataKey, metadataValue };
  });

  const errors = [];
  if (invalidSamples.size > 0) errors.push(`Invalid sample names on line(s): ${Array.from(invalidSamples).join(', ')}`);
  if (invalidLines.length > 0) errors.push(`Invalid line(s): ${invalidLines.join(', ')}`);
  if (invalidDuplicates.length > 0) errors.push(`Multiple assignments to the same entry on lines: ${invalidDuplicates.join(', ')}`);
  if (errors.length > 0) throw new BadRequestError(errors.join('\n'));

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
  parseMetadataFromTSV,
};
