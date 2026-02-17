const k8s = require('@kubernetes/client-node');
const getLogger = require('../../../../utils/getLogger');
const asyncTimer = require('../../../../utils/asyncTimer');

const logger = getLogger();

const getPods = async (namespace, statusSelector, labelSelector, kc) => {
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
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

const waitForPodsWithRetry = async (
  namespace,
  kc,
  experimentId,
  retriesRemaining,
  pollIntervalMs,
) => {
  const pods = await getAvailablePods(namespace, kc, experimentId);
  if (pods.length > 0) {
    return pods;
  }

  if (retriesRemaining <= 0) {
    return pods;
  }

  logger.log('No available worker pods, waiting...');
  await asyncTimer(pollIntervalMs);

  return waitForPodsWithRetry(
    namespace,
    kc,
    experimentId,
    retriesRemaining - 1,
    pollIntervalMs,
  );
};

const waitForAvailablePods = async (
  namespace,
  kc,
  experimentId,
  maxWaitMs = 60000,
  pollIntervalMs = 1000,
) => {
  const maxTries = Math.ceil(maxWaitMs / pollIntervalMs);
  return waitForPodsWithRetry(
    namespace,
    kc,
    experimentId,
    maxTries - 1,
    pollIntervalMs,
  );
};

module.exports = waitForAvailablePods;
