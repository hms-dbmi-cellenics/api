const generateETag = require('../helpers/worker/generateEtag');
const getWorkResults = require('../helpers/worker/getWorkResults');

const validateAndSubmitWork = require('./validateAndSubmitWork');



const getSignedUrlIfAvailable = async (experimentId, ETag) => {
  try {
    const { signedUrl } = await getWorkResults(experimentId, ETag);
    return signedUrl;
  } catch (e) {
    // 404 => indicates there are no work results present in S3 which is fine
    // other error => should be raised
    if (e.status !== 404) {
      throw e;
    }
  }
  return null;
};


const handleWorkRequest = async (Authorization, data) => {
  const { experimentId, body, requestProps } = data;

  // 1. Generate ETag for the new work request
  const ETag = await generateETag({ experimentId, body, requestProps });

  // 2. Check if there are already existing work results for this ETag
  const signedUrl = await getSignedUrlIfAvailable(experimentId, ETag);

  // 3. If the results were not in S3, send the request to the worker
  if (signedUrl === null) {
    const workRequest = { ETag, Authorization, ...data };
    await validateAndSubmitWork(workRequest);
  }

  return { ETag, signedUrl };
};

module.exports = handleWorkRequest;
