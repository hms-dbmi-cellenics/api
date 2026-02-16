const k8s = require('@kubernetes/client-node');
const config = require('../../../../config');
const getLogger = require('../../../../utils/getLogger');
const waitForAvailablePods = require('./waitForAvailablePods');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const logger = getLogger();

const getDeployment = async (name, namespace) => {
  const k8sApi = kc.makeApiClient(k8s.AppsV1Api);
  // find the particular deployment
  const { body: deployment } = await k8sApi.readNamespacedDeployment(name, namespace);
  return deployment;
};

const scaleDeploymentReplicas = async (name, namespace, deployment, desiredReplicas = 1) => {
  const k8sApi = kc.makeApiClient(k8s.AppsV1Api);

  logger.log(`Scaling ${name} from ${deployment.spec.replicas} to ${desiredReplicas} replicas...`);

  // edit
  // eslint-disable-next-line no-param-reassign
  deployment.spec.replicas = desiredReplicas;

  // replace
  await k8sApi.replaceNamespacedDeployment(name, namespace, deployment);
};


const createWorkerResources = async (service) => {
  const { sandboxId } = config;
  const { experimentId } = service.workRequest;

  const namespace = `worker-${sandboxId}`;
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

  // scale pods if worker has less than desired replicas
  const minDesiredReplicas = 1;

  try {
    const deployment = await getDeployment('worker', namespace);
    const { replicas } = deployment.spec;
    if (replicas < minDesiredReplicas) {
      await scaleDeploymentReplicas('worker', namespace, deployment, minDesiredReplicas);
    }
  } catch (e) {
    logger.log('Could not scale replicas, ignoring...', e);
  }

  // Wait for pods to become available and return one
  const pods = await waitForAvailablePods(namespace, kc, experimentId);

  if (pods.length < 1) {
    throw new Error(`Experiment ${experimentId} cannot be launched as there are no available workers after waiting.`);
  }

  logger.log(pods.length, `candidate pods found for experiment ${experimentId}. Selecting one...`);

  // Select a pod to run this experiment on.
  const selectedPod = parseInt(experimentId, 16) % pods.length;
  const { metadata: { name, creationTimestamp, labels }, status: { phase } } = pods[selectedPod];
  logger.log('Pod number', selectedPod, ' with name', name, 'chosen');

  // If pod is already assigned to this experiment, return it without patching
  if (labels && labels.experimentId === experimentId) {
    logger.log(`Pod ${name} already assigned to experiment ${experimentId}`);
    return { name, creationTimestamp, phase };
  }

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