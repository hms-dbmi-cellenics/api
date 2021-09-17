const k8s = require('@kubernetes/client-node');
const AWSXRay = require('aws-xray-sdk');
const getLogger = require('../../utils/getLogger');

const logger = getLogger();

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
// the full activityArn is too long to be used as a tag (> 63 chars)
// so we just send the last part of the arn as the rest can be constructed.
//  E.g.
// arn:aws:states:eu-west-1:242905224710:activity:pipeline-production-01037a63-a801-4ea4-a93e-...
// => pipeline-production-01037a63-a801-4ea4-a93e-def76c1e5bd2
const getActivityId = (activityArn) => {
  if (activityArn === undefined) {
    return undefined;
  }

  const split = activityArn.split(':');
  return split[split.length - 1];
};

const pipelineAssign = async (io, message) => {
  AWSXRay.getSegment().addMetadata('message', message);

  const {
    sandboxId, experimentId, activityArn, processName,
  } = message;

  const activityId = getActivityId(activityArn);

  const namespace = `pipeline-${sandboxId}`;
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

  const [assignedPods, unassignedPods] = await Promise.all(
    [
      k8sApi.listNamespacedPod(namespace, null, null, null, 'status.phase=Running', `activityId=${activityId}`),
      k8sApi.listNamespacedPod(namespace, null, null, null, null, '!activityId'),
    ],
  );

  assignedPods.body.items.forEach((pod) => {
    const { name } = pod.metadata;
    logger.log(`Found pipeline running pod ${name}, removing...`);
    k8sApi.removeNamespacedPod(name, namespace);
  });

  const pods = unassignedPods.body.items;
  logger.log(pods.length, 'unassigned candidate pods found. Selecting one...');

  // Select a pod to run this experiment on.
  const selectedPod = parseInt(activityId, 16) % pods.length;
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

module.exports = pipelineAssign;
