/* eslint-disable no-await-in-loop */
const k8s = require('@kubernetes/client-node');
const getLogger = require('../getLogger');

const logger = getLogger();

const kc = new k8s.KubeConfig();
kc.loadFromDefault();


const removeRunningPods = async (k8sApi, message) => {
  const { experimentId, input: { sandboxId } } = message;
  const namespace = `pipeline-${sandboxId}`;
  const assignedPods = await k8sApi.listNamespacedPod(namespace, null, null, null, null, `experimentId=${experimentId},type=pipeline`);

  await Promise.all(assignedPods.body.items.map((pod) => {
    const { name } = pod.metadata;
    logger.log(`Found pipeline running pod ${name}, removing...`);
    return k8sApi.deleteNamespacedPod(name, namespace);
  }));
};


const cleanupPods = async (message) => {
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  const { experimentId, input: { sandboxId, activityId } } = message;

  logger.log(`Removing pipeline pods for experiment ${experimentId} in sandbox ${sandboxId} for activity ${activityId}`);
  await removeRunningPods(k8sApi, message);
};

module.exports = { cleanupPods };
