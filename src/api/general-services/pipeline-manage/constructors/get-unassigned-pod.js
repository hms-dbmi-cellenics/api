const config = require('../../../../config');

const getUnassignedPod = (context, step) => {
  const {
    clusterInfo,
  } = context;

  return {
    ...step,
    Type: 'Task',
    Comment: 'Retrieves an unassigned pipeline pod.',
    Resource: 'arn:aws:states:::eks:call',
    OutputPath: '$.ResponseBody.items[0]',
    Parameters: {
      ClusterName: clusterInfo.name,
      CertificateAuthority: clusterInfo.certAuthority,
      Endpoint: clusterInfo.endpoint,
      Method: 'GET',
      Path: `/api/v1/namespaces/${config.pipelineNamespace}/pods`,
      QueryParameters: {
        labelSelector: [
          '!activityId,type=pipeline',
        ],
      },
    },
    Retry: [
      {
        ErrorEquals: ['EKS.404'],
        IntervalSeconds: 1,
        BackoffRate: 2.0,
        MaxAttempts: 5,
      },
    ],
    // Catch: [
    //   {
    //     ErrorEquals: ['EKS.404'],
    //     ResultPath: '$.error-info',
    //     Next: step.XNextOnCatch || step.Next,
    //   },
    // ],
  };
};

module.exports = getUnassignedPod;
