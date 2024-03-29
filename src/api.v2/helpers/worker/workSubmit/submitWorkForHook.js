const validateAndSubmitWork = require('../../../events/validateAndSubmitWork');
const generateETag = require('../generateEtag');


const submitWorkForHook = async (experimentId, authJWT, body) => {
  const requestProps = {
    broadcast: false,
    cacheUniquenessKey: null,
  };

  const data = {
    experimentId,
    body,
    requestProps,
  };

  const ETag = await generateETag(data);
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
    requestProps,
  };

  await validateAndSubmitWork(request);

  // explicitly return ETag to make it stand out more in tests and so harder to break
  return ETag;
};

module.exports = submitWorkForHook;
