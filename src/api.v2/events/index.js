const AWSXRay = require('aws-xray-sdk');
const handleWorkRequest = require('./handleWorkRequest');
const getLogger = require('../../utils/getLogger');
const config = require('../../config');

const logger = getLogger();

module.exports = (socket) => {
  socket.on('WorkRequest-v2', (data) => {
    const segment = new AWSXRay.Segment(`API-${config.clusterEnv}-${config.sandboxId}`);
    const ns = AWSXRay.getNamespace();

    ns.runPromise(async () => {
      AWSXRay.capturePromise();
      AWSXRay.setSegment(segment);

      logger.log(`[REQ ??, SOCKET ${socket.id}] Work submitted from client.`);
      logger.log(`[REQ ??, SOCKET ${socket.id}] ${JSON.stringify(data, null, 2)}`);

      const { experimentId } = data;
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
      await handleWorkRequest(socket, data, segment);

      segment.close();
    });
  });
};
