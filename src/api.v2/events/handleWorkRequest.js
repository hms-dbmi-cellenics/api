const AWSXRay = require('aws-xray-sdk');
const getLogger = require('../../utils/getLogger');

const logger = getLogger();
const validateAndSubmitWork = require('./validateAndSubmitWork');
const { authenticationMiddlewareSocketIO, authorize } = require('../middlewares/authMiddlewares');
const invalidatePlotsForEvent = require('../../utils/plotConfigInvalidation/invalidatePlotsForEvent');
const events = require('../../utils/plotConfigInvalidation/events');

const handleWorkRequest = async (socket, data, xraySegment) => {
  const { uuid, Authorization, experimentId } = data;

  try {
    // Authenticate and authorize the user
    if (!Authorization) {
      throw new Error('Authentication token must be present.');
    }
    const jwtClaim = await authenticationMiddlewareSocketIO(Authorization, socket);
    const { sub: userId } = jwtClaim;
    await authorize(userId, 'socket', null, experimentId);
    const podInfo = await validateAndSubmitWork(data);

    socket.emit(`WorkerInfo-${experimentId}`, {
      response: {
        podInfo,
        trace: AWSXRay.getSegment().trace_id,
      },
    });


    if (data.name === 'GetEmbedding') {
      await invalidatePlotsForEvent(experimentId, events.EMBEDDING_MODIFIED);
    }
  } catch (e) {
    logger.log(`[REQ ??, SOCKET ${socket.id}] Error while processing WorkRequest event.`);
    logger.trace(e);
    xraySegment.addError(e);

    socket.emit(`WorkResponse-${uuid}`, {
      request: { ...data },
      results: [],
      response: {
        cacheable: false,
        error: e.message,
        trace: AWSXRay.getSegment().trace_id,
      },
    });

    logger.log(`[REQ ??, SOCKET ${socket.id}] Error sent back to client.`);
  }
};

module.exports = handleWorkRequest;
