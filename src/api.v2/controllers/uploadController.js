const { getPartUploadSignedUrl } = require('../helpers/s3/signedUrl');

const getLogger = require('../../utils/getLogger');

const logger = getLogger('[uploadController] - ');

const getUploadPartSignedUrl = async (req, res) => {
  const { experimentId, uploadId, partNumber } = req.params;
  const { bucket, key } = req.query;

  logger.log(`Experiment: ${experimentId}, getting part ${partNumber} for upload: ${uploadId}`);

  const signedUrl = await getPartUploadSignedUrl(key, bucket, uploadId, partNumber);

  logger.log(`Finished getting part ${partNumber} for experiment ${experimentId}, upload: ${uploadId}`);

  res.json(signedUrl);
};

module.exports = { getUploadPartSignedUrl };
