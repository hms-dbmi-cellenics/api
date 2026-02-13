const generateETag = require('../helpers/worker/generateEtag');
const getWorkResults = require('../helpers/worker/getWorkResults');
const validateAndSubmitWork = require('./validateAndSubmitWork');
const waitForWorkerReady = require('../helpers/worker/waitForWorkerReady');

const getSignedUrlIfAvailable = async (experimentId, ETag) => {
  try {
    const { signedUrl } = await getWorkResults(experimentId, ETag);
    return signedUrl;
  } catch (e) {
    if (e.status !== 404) {
      throw e;
    }
  }
  return null;
};

const handleWorkRequest = async (Authorization, data) => {
  const { experimentId, body, requestProps } = data;
  const ETag = await generateETag({ experimentId, body, requestProps });
  const signedUrl = await getSignedUrlIfAvailable(experimentId, ETag);

  if (signedUrl !== null) {
    return { ETag, signedUrl };
  }

  const workRequest = { ETag, Authorization, ...data };
  const podInfo = await validateAndSubmitWork(workRequest);

  // Wait for worker to become ready (with timeout) after it's been created
  // Only wait if a pod was actually assigned (podInfo will have name property)
  if (podInfo && podInfo.name) {
    const waitTimeoutMs = 120000; // 2 minutes
    const waitIntervalMs = 5000;
    const waitResult = await waitForWorkerReady(experimentId, waitTimeoutMs, waitIntervalMs);

    if (waitResult === 'timeout') {
      return { ETag, signedUrl: null, errorCode: 'WORKER_STARTUP_TIMEOUT' };
    }
  }

  return { ETag, signedUrl: null };
};

module.exports = handleWorkRequest;
