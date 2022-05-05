const getS3Client = require('./S3Client');
const NotFoundError = require('../../../utils/responses/NotFoundError');

const getObject = async (params) => {
  if (!params.Bucket) throw new Error('Bucket is required');
  if (!params.Key) throw new Error('Key is required');

  const s3 = getS3Client();

  try {
    const outputObject = await s3.getObject(params).promise();
    const data = outputObject.Body.toString();
    return data;
  } catch (e) {
    if (e.code === 'NoSuchKey') {
      throw new NotFoundError(`Couldn't find object with key: ${params.Key}`);
    }

    if (e.code === 'NoSuchBucket') {
      throw new NotFoundError(`Couldn't find bucket with key: ${params.Bucket}`);
    }

    throw e;
  }
};

module.exports = getObject;
