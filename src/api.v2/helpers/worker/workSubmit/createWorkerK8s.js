const k8s = require('@kubernetes/client-node');
const config = require('../../../../config');
const asyncTimer = require('../../../../utils/asyncTimer');
const getLogger = require('../../../../utils/getLogger');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const logger = getLogger();

// getAvailablePods retrieves pods not assigned already to an activityID given a selector
const getPods = async (namespace, statusSelector, labelSelector) => {
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

  const pods = await k8sApi.listNamespacedPod(
    namespace, null, null, null, statusSelector, labelSelector,
  );
  return pods.body.items;
};


const getAssignedPods = async (experimentId, namespace) => {
  // check if there's already a running pod for this experiment
  const assignedRunningPods = await getPods(namespace, 'status.phase=Running', `experimentId=${experimentId}`);
  if (assignedRunningPods.length > 0) {
    return assignedRunningPods;
  }

  // check if there's already a pending pod for this experiment
  const assignedPendingPods = await getPods(namespace, 'status.phase=Pending', `experimentId=${experimentId}`);
  if (assignedPendingPods.length > 0) {
    return assignedPendingPods;
  }

  return [];
};

const getAvailablePods = async (namespace) => {
  let pods = await getPods(namespace, 'status.phase=Running', '!experimentId,!run');
  if (pods.length < 1) {
    logger.log('no running pods available, trying to select pods still pending');
    pods = await getPods(namespace, 'status.phase=Pending', '!experimentId,!run');
  }
  return pods;
};

const getDeployment = async (name, namespace) => {
  const k8sApi = kc.makeApiClient(k8s.AppsV1Api);

  // find the particular deployment
  const { body: deployment } = await k8sApi.readNamespacedDeployment(name, namespace);
  return deployment;
};

//
const scaleDeploymentReplicas = async (name, namespace, replicas) => {
  const k8sApi = kc.makeApiClient(k8s.AppsV1Api);

  const deployment = await getDeployment(name, namespace);
  logger.log(`Scaling ${name} from ${deployment.spec.replicas} to ${replicas} replicas...`);

  // edit
  deployment.spec.replicas = replicas;

  // replace
  await k8sApi.replaceNamespacedDeployment(name, namespace, deployment);

  logger.log('Waiting for pods to initiate...');
  await asyncTimer(5000);
};


const createWorkerResources = async (service) => {
  const { sandboxId } = config;
  const { experimentId } = service.workRequest;

  const namespace = `worker-${sandboxId}`;
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

  // // check if there's already as assigned pod to this experiment
  const assignedPods = await getAssignedPods(experimentId, namespace);
  if (assignedPods.length > 0) {
    if (assignedPods.length > 1) {
      logger.error(`Experiment ${experimentId} has two workers pods assigned.`);
    }

    const { metadata: { name, creationTimestamp }, status: { phase } } = assignedPods[0];
    logger.log(`Experiment ${experimentId} already assigned a worker, skipping creation...`);
    return { name, creationTimestamp, phase };
  }

  // scale pods if worker has zero replicas
  let pods = await getAvailablePods(namespace);
  const { spec: { replicas } } = await getDeployment('worker', namespace);
  if (pods.length < 1 && replicas === 0) {
    await scaleDeploymentReplicas('worker', namespace, 1);
    pods = await getAvailablePods(namespace);
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
