const config = require('../../config');
const AWS = require('../../utils/requireAWS');
const getLogger = require('../../utils/getLogger');
const { UnauthorizedError, NotFoundError } = require('../../utils/responses');

const { getSignedUrl } = require('../../utils/aws/s3');

const logger = getLogger();

const getWorkResults = async (experimentId, ETag) => {
  const s3 = new AWS.S3();
  const params = {
    Bucket: `worker-results-${config.clusterEnv}`,
    Key: ETag,
  };

  let objectTagging = [];

  // once we get here, the authorization middleware has already run so we
  // know that the user has permissions to access the given experiment_id
  // however, we need to verify that the given ETag matches the authorized
  // experimentId
  try {
    objectTagging = await s3.getObjectTagging(params).promise();
  } catch (err) {
    // the API asks for the results before they are available, we just return a not found
    if (err.code === 'NoSuchKey') {
      throw new NotFoundError(`Couldn't find s3 worker results bucket with key: ${ETag}`);
    }

    logger.log('Error received while getting object tags', err);
    throw err;
  }

  const experimentIdTag = objectTagging.TagSet.filter((tag) => tag.Key === 'experimentId')[0].Value;
  if (experimentIdTag !== experimentId) {
    throw new UnauthorizedError(`User was authorized for experiment ${experimentId} but the requested
    worker results belong to experiment ${experimentIdTag}.`);
  }

  const signedUrl = getSignedUrl('getObject', params);
  return { signedUrl };
};

module.exports = getWorkResults;
