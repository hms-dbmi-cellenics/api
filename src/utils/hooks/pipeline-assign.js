/* eslint-disable no-await-in-loop */
const k8s = require('@kubernetes/client-node');
const getLogger = require('../getLogger');
const validateRequest = require('../schema-validator');
const constants = require('../../api/general-services/pipeline-manage/constants');
const asyncTimer = require('../asyncTimer');

const logger = getLogger();

const kc = new k8s.KubeConfig();
kc.loadFromDefault();


const removeRunningPods = async (k8sApi, message) => {
  const { input: { sandboxId, activityId } } = message;
  const namespace = `pipeline-${sandboxId}`;
  const assignedPods = await k8sApi.listNamespacedPod(namespace, null, null, null, 'status.phase=Running', `activityId=${activityId},type=pipeline`);

  await Promise.all(assignedPods.body.items.map((pod) => {
    const { name } = pod.metadata;
    logger.log(`Found pipeline running pod ${name}, removing...`);
    return k8sApi.deleteNamespacedPod(name, namespace);
  }));
};

const patchPod = async (k8sApi,
  namespace,
  unassignedPods,
  experimentId,
  activityId,
  processName) => {
  const pods = unassignedPods.body.items;

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

// patchPodWithRetries tries to assign an available pod the the pipeline defined by message
// total wait time = IntervalSeconds*[(1 - BackoffRate^(MaxAttempts))/(1-BackoffRate)]
// default params wait up to 226 seconds for 12 attempts, 1.5 backoff rate
const patchPodWithRetries = async (k8sApi, message, maxAttempts = 12, backoffRate = 1.5) => {
  const { experimentId, input: { sandboxId, activityId, processName } } = message;
  const namespace = `pipeline-${sandboxId}`;

  for (let retry = 0; retry <= maxAttempts; retry += 1) {
    try {
      const unassignedPods = await k8sApi.listNamespacedPod(namespace, null, null, null, 'status.phase=Running', '!activityId,type=pipeline');
      // remove pipeline pods already assigned to this experiment
      await removeRunningPods(k8sApi, message);

      await patchPod(k8sApi, namespace, unassignedPods, experimentId, activityId, processName);
      return;
    } catch (e) {
      if (retry < maxAttempts) {
        const timeout = (backoffRate ** (retry + 1)) * 1000; // in ms
        logger.log(`Failed to patch pod for experiment ${experimentId}: ${e}. Retry [${retry}]. Waiting for ${timeout} ms before trying again. `);
        await asyncTimer(timeout);
      } else {
        throw new Error(`Failed to patch pod after ${maxAttempts} retries.`);
      }
    }
  }
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

  // // remove pipeline pods already assigned to this experiment
  // await removeRunningPods(k8sApi, message);

  // try to choose a free pod and assign it to the current pipeline
  try {
    await patchPodWithRetries(k8sApi, message);
  } catch (e) {
    logger.error(`Failed to assign pipeline pod to experiment ${experimentId}: ${e}`);
  }
};

module.exports = { assignPodToPipeline };
