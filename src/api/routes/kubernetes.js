// const AWSXRay = require('aws-xray-sdk');
// const Gem2sService = require('../route-services/gem2s');
// const parseSNSMessage = require('../../utils/parse-sns-message');
const k8s = require('@kubernetes/client-node');
const getLogger = require('../../utils/getLogger');
const config = require('../../config');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

// const { expressAuthorizationMiddleware } = require('../../utils/authMiddlewares');

const logger = getLogger();

module.exports = {
  'kubernetes#event': [
    // expressAuthorizationMiddleware,
    async (req) => {
      logger.log('received kubernetes event');
      const { reason, message, metadata: { name, namespace } } = req.Body;
      logger.log(`[${reason}]received kubernetes event: ${message} ${name} in ${namespace}`);

      if (config.clusterEnv === 'development') {
        logger.log(`should not receive crash loops in  ${config.clusterEnv} env.`);
        return;
      }

      const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
      logger.log(`removing pod ${name} in ${namespace}`);
      await k8sApi.deleteNamespacedPod(name, namespace);
    },
  ],
};
