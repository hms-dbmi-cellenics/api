const { completeMultipartUpload } = require('../helpers/s3/signedUrl');

const bucketNames = require('../../config/bucketNames');
const getLogger = require('../../utils/getLogger');
const { OK, NotFoundError } = require('../../utils/responses');

const logger = getLogger();
const completeMultipartUploads = async (req, res) => {
  const {
    fileId, uploadId, parts, type,
  } = req.body;
  let bucketName;
  if (type === 'sample') {
    bucketName = bucketNames.SAMPLE_FILES;
  } else if (type === 'cellLevel') {
    bucketName = bucketNames.CELL_METADATA;
  } else {
    throw new NotFoundError('Invalid bucket specified');
  }
  logger.log(`completing multipart upload for file ${fileId}`);

  await completeMultipartUpload(fileId, parts, uploadId, bucketName);

  logger.log(`completed multipart upload for file ${fileId}`);
  res.json(OK());
};

module.exports = {
  completeMultipartUploads,
};
