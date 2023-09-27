const getLogger = require('../../utils/getLogger');
const getWorkResults = require('../helpers/worker/getWorkResults');

const logger = getLogger();
const validateAndSubmitWork = require('./validateAndSubmitWork');

const handleWorkRequest = async (socket, data) => {
  const { Authorization, experimentId, ETag } = data;

  try {
    const { signedUrl } = await getWorkResults(experimentId, ETag);

    socket.emit(`WorkResponse-${ETag}`, {
      request: { ...data },
      results: [],
      response: {
        cacheable: false,
        signedUrl,
        error: null,
      },
    });

    return;
  } catch (e) {
    if (e.status === 404) {
      console.log(`Work result ${ETag} not cached, submitting request`);
    } else {
      throw e;
    }
  }

  try {
    // Authenticate and authorize the user
    if (!Authorization) {
      throw new Error('Authentication token must be present.');
    }

    const podInfo = await validateAndSubmitWork(data);

    console.log('Emmiting WorkerInfo: ', podInfo);

    socket.emit(`WorkerInfo-${experimentId}`, {
      response: {
        podInfo,
      },
    });
  } catch (e) {
    logger.log(`[REQ ??, SOCKET ${socket.id}] Error while processing WorkRequest event.`);
    logger.trace(e);

    socket.emit(`WorkResponse-${ETag}`, {
      request: { ...data },
      results: [],
      response: {
        cacheable: false,
        error: e.message,
      },
    });

    logger.log(`[REQ ??, SOCKET ${socket.id}] Error sent back to client.`);
  }
};

module.exports = handleWorkRequest;
