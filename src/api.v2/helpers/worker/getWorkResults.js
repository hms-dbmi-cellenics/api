const config = require('../../../config');
const AWS = require('../../../utils/requireAWS');
const getLogger = require('../../../utils/getLogger');
const { UnauthorizedError, NotFoundError, InternalServerError } = require('../../../utils/responses');
const formatExperimentId = require('../../../utils/v1Compatibility/formatExperimentId');

const { getSignedUrl } = require('../../../utils/aws/s3');

const logger = getLogger();

/**
 * Form of authorization based on S3 tags
 * Validates that the tag matches the authorized experiment id
 * If they don't match, throws an exception
 */
const validateTagMatching = async (experimentId, params) => {
  const s3 = new AWS.S3();

  let objectTagging = [];
  try {
    objectTagging = await s3.getObjectTagging(params).promise();
  } catch (err) {
    // the API asks for the results before they are available, we just return a not found
    if (err.code === 'NoSuchKey') {
      throw new NotFoundError(`Couldn't find s3 worker results bucket with key: ${params.Key}. Reason ${err.code}`);
    }

    // getting an object's tags that does not exist might throw an AccessDenied error
    // in this case (and in general with other exceptions) we throw a NotFound error
    // so the UI will send a new work request instead of crashing.
    logger.log(`Error received while getting object ${params.Key} tags for ${experimentId}`, err);
    throw new NotFoundError(`Couldn't get worker results with key: ${params.Key}. Reason ${err.code}`);
  }

  if (!objectTagging.TagSet) {
    throw new InternalServerError(`S3 work results key ${params.Key} has no tags`);
  }

  const experimentIdTag = objectTagging.TagSet.filter((tag) => tag.Key === 'experimentId')[0].Value;
  if (formatExperimentId(experimentIdTag) !== experimentId) {
    throw new UnauthorizedError(`User was authorized for experiment ${experimentId} but the requested `
      + `worker results belong to experiment ${experimentIdTag}.`);
  }
};

const getWorkResults = async (experimentId, ETag) => {
  logger.log(`Getting worker result for experiment: ${experimentId}, Etag: ${ETag}`);

  const params = {
    Bucket: `worker-results-${config.clusterEnv}`,
    Key: ETag,
  };
  const formattedExperimentId = formatExperimentId(experimentId);

  await validateTagMatching(formattedExperimentId, params);

  logger.log(`Found worker results for experiment: ${experimentId}, Etag: ${ETag}`);

  const signedUrl = getSignedUrl('getObject', params);
  return { signedUrl };
};

module.exports = getWorkResults;
