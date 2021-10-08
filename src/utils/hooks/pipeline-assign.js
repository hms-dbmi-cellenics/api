const k8s = require('@kubernetes/client-node');
const getLogger = require('../getLogger');
const validateRequest = require('../schema-validator');

const logger = getLogger();

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);


const getPods = async (namespace, activityId) => {
  const [assignedPods, unassignedPods] = await Promise.all(
    [
      k8sApi.listNamespacedPod(namespace, null, null, null, 'status.phase=Running', `activityId=${activityId},type=pipeline`),
      k8sApi.listNamespacedPod(namespace, null, null, null, null, '!activityId,type=pipeline'),
    ],
  );

  return [assignedPods, unassignedPods];
};

const removeRunningPods = async (namespace, assignedPods) => {
  assignedPods.body.items.forEach((pod) => {
    const { name } = pod.metadata;
    logger.log(`Found pipeline running pod ${name}, removing...`);
    k8sApi.removeNamespacedPod(name, namespace);
  });
};

const patchPod = async (namespace,
  unassignedPods,
  experimentId,
  activityId,
  processName) => {
  const pods = unassignedPods.body.items;
  logger.log(pods.length, 'unassigned candidate pods found. Selecting one...');

  // Select a pod to run this experiment on.
  const selectedPod = parseInt(experimentId, 16) % pods.length;
  const { name } = pods[selectedPod].metadata;
  logger.log('Pod number', selectedPod, ' with name', name, 'chosen');

  const patch = [
    { op: 'test', path: '/metadata/labels/activityId', value: null },
    {
      op: 'add', path: '/metadata/labels/activityId', value: activityId,
    },
    {
      op: 'add', path: '/metadata/labels/experimentId', value: experimentId,
    },
    {
      op: 'add', path: '/metadata/labels/processName', value: processName,
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

const assignPodToPipeline = async (message) => {
  // validate that the message contains input
  await validateRequest(message, 'PipelinePodRequest.v1.yaml');

  const { experimentId, input: { sandboxId, activityId, processName } } = message;
  const namespace = `pipeline-${sandboxId}`;

  // // try to choose a free pod and assign it to the current pipeline
  try {
    const [assignedPods, unassignedPods] = getPods(namespace, activityId);
    console.log('assignedPods');
    console.log(assignedPods);
    removeRunningPods(namespace, assignedPods);
    patchPod(namespace, unassignedPods, experimentId, activityId, processName);
  } catch (e) {
    logger.log(`Error assigning pod to ${processName} pipeline for experiment ${experimentId} in
    sandbox ${sandboxId} for activity ${activityId}: `, e);
  }
};

module.exports = { assignPodToPipeline };
