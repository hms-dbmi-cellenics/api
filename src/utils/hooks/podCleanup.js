/* eslint-disable no-await-in-loop */
const k8s = require('@kubernetes/client-node');
const getLogger = require('../getLogger');
const config = require('../../config');

const logger = getLogger();

const kc = new k8s.KubeConfig();
kc.loadFromDefault();


const deleteExperimentPods = async (experimentId) => {
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

  const namespace = `pipeline-${config.sandboxId}`;
  const assignedPods = await k8sApi.listNamespacedPod(namespace, null, null, null, null, `experimentId=${experimentId},type=pipeline`);

  await Promise.all(assignedPods.body.items.map((pod) => {
    const { name } = pod.metadata;
    logger.log(`Found pipeline running pod ${name}, removing...`);
    return k8sApi.deleteNamespacedPod(name, namespace);
  }));
};


const cleanupPods = async (message) => {
  const { experimentId } = message;
  if (config.clusterEnv !== 'development') {
    logger.log(`Removing pipeline pods for experiment ${experimentId} in sandbox ${config.sandboxId}`);
    await deleteExperimentPods(experimentId);
  } else {
    logger.log(`Ignoring pod cleanup for ${experimentId} in ${config.clusterEnv} env.`);
  }
};

module.exports = { cleanupPods, deleteExperimentPods };
