const validateAndSubmitWork = require('../../../events/validateAndSubmitWork');
const generateETag = require('../generateETag');

const submitWork = async (experimentId, authJWT, body, extraDependencies) => {
  const ETag = generateETag(experimentId, body, extraDependencies);
  const now = new Date();
  const timeout = 15 * 60 * 1000; // 15min in ms
  const timeoutDate = new Date(now.getTime() + timeout);
  const request = {
    ETag,
    socketId: 'randomID',
    experimentId,
    authJWT,
    timeout: timeoutDate.toISOString(),
    body,
  };

  await validateAndSubmitWork(request);

  // explicitly return ETag to make it stand out more in tests and so harder to break
  return ETag;
};

module.exports = submitWork;
