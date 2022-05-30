const AWSXRay = require('aws-xray-sdk');
const validateAndSubmitWork = require('./validateAndSubmitWork');
const getLogger = require('../../utils/getLogger');
const config = require('../../config');
const { authenticationMiddlewareSocketIO, authorize } = require('../middlewares/authMiddlewares');

const logger = getLogger();

const handleWorkRequest = (socket, data) => {
  const segment = new AWSXRay.Segment(`API-${config.clusterEnv}-${config.sandboxId}`);
  const ns = AWSXRay.getNamespace();

  ns.runPromise(async () => {
    AWSXRay.capturePromise();
    AWSXRay.setSegment(segment);

    logger.log(`[REQ ??, SOCKET ${socket.id}] Work submitted from client.`);
    logger.log(`[REQ ??, SOCKET ${socket.id}] ${JSON.stringify(data, null, 2)}`);

    const { uuid, Authorization, experimentId } = data;

    segment.addMetadata('request', data);
    segment.addAnnotation('podName', config.podName);
    segment.addAnnotation('sandboxId', config.sandboxId);
    segment.addAnnotation('experimentId', experimentId);

    segment.addIncomingRequestData({
      request: {
        method: 'POST',
        url: `socketio://api-${config.sandboxId}-${config.clusterEnv}/${experimentId}/WorkRequest`,
      },
    });

    try {
      // Authenticate and authorize the user
      if (!Authorization) {
        throw new Error('Authentication token must be present.');
      }
      const jwtClaim = await authenticationMiddlewareSocketIO(Authorization, socket);
      // socket.emit('asd', () => {});
      const { sub: userId } = jwtClaim;
      await authorize(userId, 'socket', null, experimentId);

      const podInfo = await validateAndSubmitWork(data);
      console.log('SUBMITTED THAT SHIT!!');
      socket.emit(`WorkerInfo-${experimentId}`, {
        response: {
          podInfo,
          trace: AWSXRay.getSegment().trace_id,
        },
      });
      console.log('SUBMITTED THAT SHIT!!!!!! yeah');
    } catch (e) {
      logger.log(`[REQ ??, SOCKET ${socket.id}] Error while processing WorkRequest event.`);
      logger.trace(e);
      segment.addError(e);
      console.log('ERROR WAS', e);

      socket.emit(`WorkResponse-${uuid}`, {
        request: { ...data },
        results: [],
        response: {
          cacheable: false,
          error: e.message,
          trace: AWSXRay.getSegment().trace_id,
        },
      });
      console.log('emitted!!');
      logger.log(`[REQ ??, SOCKET ${socket.id}] Error sent back to client.`);
    }

    segment.close();
  });
};
module.exports = handleWorkRequest;
