const MetadataTrack = require('../model/MetadataTrack');

const getLogger = require('../../utils/getLogger');
const { OK } = require('../../utils/responses');

const logger = getLogger('[MetadataTrackController] - ');

const createMetadataTrack = async (req, res) => {
  const {
    params: { experimentId, metadataTrackKey },
  } = req;

  logger.log(`Creating metadata track ${metadataTrackKey}`);

  await new MetadataTrack().createNewMetadataTrack(experimentId, metadataTrackKey);

  logger.log(`Finished creating metadata track ${metadataTrackKey} for experiment ${experimentId}`);

  res.json(OK());
};

module.exports = {
  createMetadataTrack,
};
