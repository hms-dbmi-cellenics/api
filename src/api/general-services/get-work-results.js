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

  try {
    objectTagging = await s3.getObjectTagging(params).promise();
  } catch (err) {
    logger.log('Error received while getting object tags', err);
  }
  if (!objectTagging.TagSet) {
    throw new NotFoundError('Worker results not found');
  }
  const experimentIdTag = objectTagging.TagSet.filter((tag) => tag.Key === 'experimentId')[0].Value;
  if (experimentIdTag !== experimentId) {
    throw new UnauthorizedError('User is not authorized to get worker results for this experiment');
  }

  const signedUrl = getSignedUrl('getObject', params);
  return { signedUrl };
};

module.exports = getWorkResults;
