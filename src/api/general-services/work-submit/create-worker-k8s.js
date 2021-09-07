const k8s = require('@kubernetes/client-node');
const config = require('../../../config');
const getLogger = require('../../../utils/getLogger');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const logger = getLogger();

const createWorkerResources = async (service) => {
  const { sandboxId } = config;
  const { experimentId } = service.workRequest;
  const namespace = `worker-${sandboxId}`;
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

  const [assignedPods, unassignedPods] = await Promise.all(
    [
      k8sApi.listNamespacedPod(namespace, null, null, null, 'status.phase=Running', `experimentId=${experimentId}`),

      // Look for items without an experimentId or run label. Run is used by the cleanup operator
      // so this prevents us from scheduling it as a worker by accident.
      k8sApi.listNamespacedPod(namespace, null, null, null, 'status.phase=Running', '!experimentId,!run'),
    ],
  );

  if (assignedPods.body.items.length > 0) {
    logger.log(`Experiment ${experimentId} already assigned a worker, skipping creation...`);
    return;
  }

  if (unassignedPods.body.items.length === 0) {
    throw new Error(`Experiment ${experimentId} cannot be launched as there are no available running workers.`);
  }

  const pods = unassignedPods.body.items;
  logger.log(pods.length, `unassigned candidate pods found for experiment ${experimentId}. Selecting one...`);

  // Select a pod to run this experiment on.
  const selectedPod = parseInt(experimentId, 16) % pods.length;
  const { name } = pods[selectedPod].metadata;
  logger.log('Pod number', selectedPod, ' with name', name, 'chosen');

  const patch = [
    { op: 'test', path: '/metadata/labels/experimentId', value: null },
    {
      op: 'add', path: '/metadata/labels/experimentId', value: experimentId,
    },
    {
      op: 'add', path: '/metadata/labels/workQueueHash', value: service.workerHash,
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
