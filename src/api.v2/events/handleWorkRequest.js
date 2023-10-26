const generateETag = require('../helpers/worker/generateEtag');
const getWorkResults = require('../helpers/worker/getWorkResults');

const validateAndSubmitWork = require('./validateAndSubmitWork');


//
const getSignedUrlIfAvailable = async (experimentId, ETag) => {
  try {
    const { signedUrl } = await getWorkResults(experimentId, ETag);
    return signedUrl;
  } catch (e) {
    // 404 => indicates there are no work results present in S3 which is fine
    // othere error => should be raised
    if (e.status !== 404) {
      throw e;
    }
  }
  return null;
};


const handleWorkRequest = async (data) => {
  const { experimentId } = data;

  // 1. Generate ETag for the new work requets
  const ETag = await generateETag(data);

  // 2. Check if there are already existing work results for this ETag
  const signedUrl = await getSignedUrlIfAvailable(experimentId, ETag);

  // 3. If the results were not in S3, send the request to the worker
  if (signedUrl === null) {
    const workRequest = { ETag, ...data };
    await validateAndSubmitWork(workRequest);
  }

  // I think podInfo can be removed as we get better and fresher updates from the worker now.
  return { ETag, signedUrl };
};

module.exports = handleWorkRequest;
