const AWSXRay = require('aws-xray-sdk');
const k8s = require('@kubernetes/client-node');
const getLogger = require('../../utils/getLogger');
const config = require('../../config');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

// const { expressAuthorizationMiddleware } = require('../../utils/authMiddlewares');

const logger = getLogger();

module.exports = {
  // 'kubernetes#event': [
  // expressAuthorizationMiddleware,
  'kubernetes#event': async (req, res) => {
    logger.log('received kubernetes event');

    try {
      const { reason, message, involvedObject: { name, namespace } } = req.body;
      logger.log(`[${reason}]received kubernetes event: ${message} ${name} in ${namespace}`);

      if (namespace !== `pipeline-${config.sandboxId}`) {
        logger.log(`ignoring event from namespace ${namespace}.`);
        return;
      }

      if (reason !== 'BackOff' || config.clusterEnv === 'development') {
        logger.log(`ignoring event ${reason} in  ${config.clusterEnv} env.`);
        return;
      }

      const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
      logger.log(`removing pod ${name} in ${namespace}`);
      await k8sApi.deleteNamespacedPod(name, namespace);
    } catch (e) {
      logger.error('error processing k8s event');
      logger.log(req);
      logger.error(e);
      AWSXRay.getSegment().addError(e);
      res.status(200).send('nok');
      return;
    }
    logger.log(req);

    res.status(200).send('ok');
  },
  // ],
};
