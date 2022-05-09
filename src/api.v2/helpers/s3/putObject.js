const NotFoundError = require('../../../utils/responses/NotFoundError');
const getS3Client = require('./getS3Client');

const putObject = async (params) => {
  if (!params.Bucket) throw new Error('Bucket is required');
  if (!params.Key) throw new Error('Key is required');
  if (!params.Body) throw new Error('Body is required');

  const s3 = getS3Client();

  try {
    await s3.putObject(params).promise();
  } catch (e) {
    if (e.code === 'NoSuchBucket') {
      throw new NotFoundError(`Couldn't find bucket with key: ${params.Bucket}`);
    }

    throw e;
  }
};

module.exports = putObject;
