const k8s = require('@kubernetes/client-node');
const config = require('../../../config');
const logger = require('../../../utils/logging');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const createWorkerResources = async (service) => {
  const { sandboxId } = config;
  const { experimentId } = service.workRequest;
  const namespace = `worker-${sandboxId}`;
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

  const [assignedPods, unassignedPods] = await Promise.all(
    [
      k8sApi.listNamespacedPod(namespace, null, null, null, null, `experimentId=${experimentId}`),
      k8sApi.listNamespacedPod(namespace, null, null, null, null, 'experimentId DoesNotExist'),
    ],
  );

  if (assignedPods.body.items.length > 0) {
    logger.log('Experiment already assigned a worker, skipping creation...');
    return;
  }

  const pods = unassignedPods.body.items;
  logger.log(pods.length, 'unassigned candidate pods found. Selecting one...');

  // Select a pod to run this experiment on.
  const selectedPod = parseInt(experimentId, 16) % pods.length;
  const { name } = pods[selectedPod].metadata;
  logger.log('Pod number', selectedPod, ' with name', name, 'chosen');

  const patch = [
    {
      op: 'add', path: '/metadata/labels/experimentId', value: experimentId,
    },
  ];
  await k8sApi.patchNamespacedPod(name, namespace, patch,
    undefined, undefined, undefined, undefined,
    {
      headers: {
        'content-type': 'application/json-patch+json',
      },
    });
};

module.exports = createWorkerResources;
