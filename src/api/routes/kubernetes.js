const AWSXRay = require('aws-xray-sdk');
const k8s = require('@kubernetes/client-node');
const getLogger = require('../../utils/getLogger');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();


const logger = getLogger();

module.exports = {
  'kubernetes#event': async (req, res) => {
    logger.log('received kubernetes event');

    const { reason, message, involvedObject: { name, namespace } } = req.body;
    logger.log(`[${reason}] received kubernetes event: ${message} ${name} in ${namespace}`);

    // remove only pods in your namespace and due to backoff errors
    if ((namespace.match('^pipeline-.*') || namespace.match('^worker-.*')) && reason === 'BackOff') {
      try {
        const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
        logger.log(`removing pod ${name} in ${namespace}`);
        await k8sApi.deleteNamespacedPod(name, namespace);
      } catch (e) {
        logger.error('error processing k8s event', e);
        AWSXRay.getSegment().addError(e);
      }
    }

    res.status(200).send('ok');
  },
};
