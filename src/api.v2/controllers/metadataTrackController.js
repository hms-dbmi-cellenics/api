const MetadataTrack = require('../model/MetadataTrack');

const getLogger = require('../../utils/getLogger');
const { OK, NotFoundError } = require('../../utils/responses');

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
    throw new NotFoundError(`Metadata track ${oldKey} doesn't exist`);
  }

  logger.log(`Finished patching metadata track ${oldKey} in experiment ${experimentId}, changed to ${key}`);
  res.json(OK());
};

module.exports = {
  createMetadataTrack,
  patchMetadataTrack,
};
