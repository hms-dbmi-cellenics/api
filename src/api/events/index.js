const AWSXRay = require('aws-xray-sdk');
const handleWorkRequest = require('../event-services/work-request');
const logger = require('../../utils/logging');
const config = require('../../config');
const { authenticationMiddlewareSocketIO, authorize } = require('../../utils/authMiddlewares');

module.exports = (socket) => {
  socket.on('WorkRequest', (data) => {
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
        await authorize(experimentId, jwtClaim);
        await handleWorkRequest(data, socket);
      } catch (e) {
        logger.log(`[REQ ??, SOCKET ${socket.id}] Error while processing WorkRequest event.`);
        logger.trace(e);
        segment.addError(e);

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

      segment.close();
    });
  });
};
