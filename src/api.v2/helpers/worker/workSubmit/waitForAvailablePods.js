const getLogger = require('../../../../utils/getLogger');
const asyncTimer = require('../../../../utils/asyncTimer');
const logger = getLogger();

const getPods = async (namespace, statusSelector, labelSelector, kc) => {
  const k8sApi = kc.makeApiClient(require('@kubernetes/client-node').CoreV1Api);
  const pods = await k8sApi.listNamespacedPod(
    namespace, null, null, null, statusSelector, labelSelector,
  );
  return pods.body.items;
};

const getAvailablePods = async (namespace, kc, experimentId) => {
  // Check if there are pods already assigned to this experiment
  let pods = await getPods(namespace, 'status.phase=Running', `experimentId=${experimentId}`, kc);
  if (pods.length > 0) {
    return pods;
  }
  pods = await getPods(namespace, 'status.phase=Pending', `experimentId=${experimentId}`, kc);
  if (pods.length > 0) {
    return pods;
  }

  // Get unassigned pods
  pods = await getPods(namespace, 'status.phase=Running', '!experimentId,!run', kc);
  if (pods.length < 1) {
    logger.log('no running pods available, trying to select pods still pending');
    pods = await getPods(namespace, 'status.phase=Pending', '!experimentId,!run', kc);
  }

  return pods;
};

const waitForAvailablePods = async (namespace, kc, experimentId, maxWaitMs = 60000, pollIntervalMs = 1000) => {
  let pods = await getAvailablePods(namespace, kc, experimentId);
  const maxTries = Math.ceil(maxWaitMs / pollIntervalMs);
  for (let i = 0; pods.length < 1 && i < maxTries; i += 1) {
    logger.log('No available worker pods, waiting...');
    // eslint-disable-next-line no-await-in-loop
    await asyncTimer(pollIntervalMs);
    pods = await getAvailablePods(namespace, kc, experimentId);
  }
  return pods;
};

module.exports = waitForAvailablePods;
