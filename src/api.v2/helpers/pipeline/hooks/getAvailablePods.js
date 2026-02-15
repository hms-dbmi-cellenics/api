const k8s = require('@kubernetes/client-node');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

// getAvailablePods retrieves pods not assigned already to an activityID given a selector
const getAvailablePods = async (namespace, statusSelector) => {
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

  const pods = await k8sApi.listNamespacedPod(namespace, null, null, null, statusSelector, '!activityId,type=pipeline');
  return pods.body.items;
};

module.exports = getAvailablePods;
