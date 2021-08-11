const k8s = require('@kubernetes/client-node');
const config = require('../../../config');
const logger = require('../../../utils/logging');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const createWorkerResources = async (service) => {
  const { sandboxId } = config;

  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  const pods = await k8sApi.listNamespacedPod(`worker-${sandboxId}`);

  logger.log(pods);
};

module.exports = createWorkerResources;
