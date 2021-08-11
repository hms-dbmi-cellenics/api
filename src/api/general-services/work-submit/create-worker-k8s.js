const k8s = require('@kubernetes/client-node');
const config = require('../../../config');
const logger = require('../../../utils/logging');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const createWorkerResources = async () => {
  const { sandboxId } = config;

  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  const response = await k8sApi.listNamespacedPod(`worker-${sandboxId}`);

  const pods = response.body.items;

  logger.log(pods);
};

module.exports = createWorkerResources;
