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


const patchPod = (context, step) => {
  const {
    clusterInfo, activityArn,
  } = context;


  return {
    ...step,
    Type: 'Task',
    Comment: 'Patch pod to set the activity ID label.',
    Resource: 'arn:aws:states:::eks:call',
    Parameters: {
      ClusterName: clusterInfo.name,
      CertificateAuthority: clusterInfo.certAuthority,
      Endpoint: clusterInfo.endpoint,
      Method: 'PATCH',
      'Path.$': '$.Data.ResponseBody.items[0].metadata.selfLink',
      RequestBody: {
        metadata: {
          labels: { activityId: getActivityId(activityArn) },
        },
      },
    },
  };
};

module.exports = patchPod;
