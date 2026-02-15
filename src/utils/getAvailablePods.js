const logger = require('./getLogger')();

const getPods = async (namespace, statusSelector, labelSelector, kc) => {
  const k8sApi = kc.makeApiClient(require('@kubernetes/client-node').CoreV1Api);
  const pods = await k8sApi.listNamespacedPod(
    namespace, null, null, null, statusSelector, labelSelector,
  );
  return pods.body.items;
};

const getAvailablePods = async (namespace, kc) => {
  let pods = await getPods(namespace, 'status.phase=Running', '!experimentId,!run', kc);
  if (pods.length < 1) {
    logger.log('no running pods available, trying to select pods still pending');
    pods = await getPods(namespace, 'status.phase=Pending', '!experimentId,!run', kc);
  }
  return pods;
};

module.exports = getAvailablePods;
