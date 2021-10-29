/* eslint-disable no-await-in-loop */
const k8s = require('@kubernetes/client-node');
const getLogger = require('../getLogger');
const validateRequest = require('../schema-validator');
const constants = require('../../api/general-services/pipeline-manage/constants');

const logger = getLogger();

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const getAvailablePods = async (k8sApi, namespace, statusSelector) => {
  const unassignedPods = await k8sApi.listNamespacedPod(namespace, null, null, null, statusSelector, '!activityId,type=pipeline');
  return unassignedPods.body.items;
};

const removeRunningPods = async (k8sApi, message) => {
  const { experimentId, input: { sandboxId } } = message;
  const namespace = `pipeline-${sandboxId}`;
  const assignedPods = await k8sApi.listNamespacedPod(namespace, null, null, null, 'status.phase!=Succeeded,status.phase!=Failed', `experimentId=${experimentId},type=pipeline`);

  await Promise.all(assignedPods.body.items.map((pod) => {
    const { name } = pod.metadata;
    logger.log(`Found pipeline running pod ${name}, removing...`);
    return k8sApi.deleteNamespacedPod(name, namespace);
  }));
};

const patchPod = async (k8sApi, message) => {
  const { experimentId, input: { sandboxId, activityId, processName } } = message;
  const namespace = `pipeline-${sandboxId}`;

  // try to get an available pod which is already running
  let pods = await getAvailablePods(k8sApi, namespace, 'status.phase=Running');
  if (pods.length < 1) {
    logger.info('no running pods available, trying to select pods still being created');
    pods = await getAvailablePods(k8sApi, namespace, 'status.phase!=Succeeded,status.phase!=Failed');
  }

  if (pods.length < 1) {
    throw new Error('no unassigned pods available');
  }

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

  logger.log(`Trying to assign pod to ${processName} pipeline for experiment ${experimentId} in sandbox ${sandboxId} for activity ${activityId}`);


  // remove pipeline pods already assigned to this experiment
  await removeRunningPods(k8sApi, message);

  try {
    // try to choose a free pod and assign it to the current pipeline
    await patchPod(k8sApi, message);
  } catch (e) {
    logger.error(`Failed to assign pipeline pod to experiment ${experimentId}: ${e}`);
  }
};

module.exports = { assignPodToPipeline };
