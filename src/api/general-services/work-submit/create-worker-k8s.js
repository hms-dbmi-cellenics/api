const k8s = require('@kubernetes/client-node');
const config = require('../../../config');
const getLogger = require('../../../utils/getLogger');


const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const logger = getLogger();

// getAvailablePods retrieves pods not assigned already to an activityID given a selector
const getAvailablePods = async (namespace, statusSelector) => {
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

  const pods = await k8sApi.listNamespacedPod(namespace, null, null, null, statusSelector, '!experimentId,!run');
  return pods.body.items;
};


const createWorkerResources = async (service) => {
  const { sandboxId } = config;
  const { experimentId } = service.workRequest;
  const namespace = `worker-${sandboxId}`;
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

  const assignedPods = await k8sApi.listNamespacedPod(namespace, null, null, null, 'status.phase=Running', `experimentId=${experimentId}`);


  if (assignedPods.body.items.length === 1) {
    const { metadata: { name, creationTimestamp }, status: { phase } } = assignedPods[0];
    logger.log(`Experiment ${experimentId} already assigned a worker, skipping creation...`);
    return { name, creationTimestamp, phase };
  }

  if (assignedPods.body.items.length > 1) {
    logger.error(`Experiment ${experimentId} has two workers pods assigned.`);
    return {};
  }

  const allPods = await getAvailablePods(namespace, null);
  console.log('all worker pods: ', allPods);

  // try to get an available pod which is already running
  let pods = await getAvailablePods(namespace, 'status.phase=Running');
  if (pods.length < 1) {
    logger.log('no running pods available, trying to select pods still being created');
    pods = await getAvailablePods(namespace, 'status.phase=ContainerCreating');
  }
  if (pods.length < 1) {
    logger.log('no pods in creation process available, trying to select pods still pending');
    pods = await getAvailablePods(namespace, 'status.phase=Pending');
  }

  if (pods.length < 1) {
    throw new Error(`Experiment ${experimentId} cannot be launched as there are no available workers.`);
  }

  logger.log(pods.length, `unassigned candidate pods found for experiment ${experimentId}. Selecting one...`);

  // Select a pod to run this experiment on.
  const selectedPod = parseInt(experimentId, 16) % pods.length;
  const { metadata: { name, creationTimestamp }, status: { phase } } = pods[selectedPod];
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

  return { name, creationTimestamp, phase };
};

module.exports = createWorkerResources;
