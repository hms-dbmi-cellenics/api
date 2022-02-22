const config = require('../../config');
const AWS = require('../../utils/requireAWS');
const getLogger = require('../../utils/getLogger');
const { UnauthorizedError, NotFoundError } = require('../../utils/responses');

const { getSignedUrl } = require('../../utils/aws/s3');

const logger = getLogger();

/**
 * Form of authorization based on S3 tags
 * Validates that the tag matches the authorized experiment id
 * If they don't match, throws an exception
 */
const validateTagMatching = async (experimentId, params) => {
  let objectTagging = [];
  const s3 = new AWS.S3();

  try {
    objectTagging = await s3.getObjectTagging(params).promise();
  } catch (err) {
    // the API asks for the results before they are available, we just return a not found
    if (err.code === 'NoSuchKey') {
      throw new NotFoundError(`Couldn't find s3 worker results bucket with key: ${params.Key}`);
    }

    logger.log('Error received while getting object tags', err);
    throw err;
  }

  const experimentIdTag = objectTagging.TagSet.filter((tag) => tag.Key === 'experimentId')[0].Value;
  if (experimentIdTag !== experimentId) {
    throw new UnauthorizedError('User is not authorized to get worker results for this experiment');
  }
};

const getWorkResults = async (experimentId, ETag) => {
  const params = {
    Bucket: `worker-results-${config.clusterEnv}`,
    Key: ETag,
  };

  await validateTagMatching(experimentId, params);
  const signedUrl = getSignedUrl('getObject', params);
  return { signedUrl };
};

module.exports = getWorkResults;
