const k8s = require('@kubernetes/client-node');
const getLogger = require('../getLogger');
const validateRequest = require('../schema-validator');
const constants = require('../../api/general-services/pipeline-manage/constants');

const logger = getLogger();

const kc = new k8s.KubeConfig();
kc.loadFromDefault();


const getPods = async (k8sApi, namespace, activityId) => {
  const [assignedPods, unassignedPods] = await Promise.all(
    [
      k8sApi.listNamespacedPod(namespace, null, null, null, 'status.phase=Running', `activityId=${activityId},type=pipeline`),
      k8sApi.listNamespacedPod(namespace, null, null, null, 'status.phase=Running', '!activityId,type=pipeline'),
    ],
  );

  return [assignedPods, unassignedPods];
};

const removeRunningPods = async (k8sApi, namespace, assignedPods) => {
  await Promise.all(assignedPods.body.items.map((pod) => {
    const { name } = pod.metadata;
    logger.log(`Found pipeline running pod ${name}, removing...`);
    return k8sApi.removeNamespacedPod(name, namespace);
  }));
};

const patchPod = async (k8sApi,
  namespace,
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
  // this checks should be refactored and cleaned once the gem2s / qc spec refactors are done
  // and we can be sure that taskName is always present at the top-level of all the message
  // instead of inside input
  if (message && message.taskName !== constants.ASSIGN_POD_TO_PIPELINE) {
    return;
  }

  // validate that the message contains input
  await validateRequest(message, 'PipelinePodRequest.v1.yaml');

  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

  const { experimentId, input: { sandboxId, activityId, processName } } = message;
  const namespace = `pipeline-${sandboxId}`;

  logger.log(`Assigning pod to ${processName} pipeline for experiment ${experimentId} in sandbox ${sandboxId} for activity ${activityId}`);
  // try to choose a free pod and assign it to the current pipeline
  try {
    const [assignedPods, unassignedPods] = await getPods(k8sApi, namespace, activityId);
    await removeRunningPods(k8sApi, namespace, assignedPods);
    await patchPod(k8sApi, namespace, unassignedPods, experimentId, activityId, processName);
  } catch (e) {
    logger.log('Error assigning pod: ', e);
  }
};

module.exports = { assignPodToPipeline };
