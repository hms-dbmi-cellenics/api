const config = require('../../../../config');

const constructDeleteCompletedJobs = (context, step) => {
  const {
    accountId,
  } = context;

  if (config.clusterEnv === 'development') {
    return {
      ...step,
      Type: 'Task',
      Comment: 'Removes Docker containers with pipeline runs on the local machine.',
      Resource: 'arn:aws:states:::lambda:invoke',
      Parameters: {
        FunctionName: `arn:aws:lambda:eu-west-1:${accountId}:function:remove-previous-pipeline-containers`,
      },
    };
  }

  return {
    ...step,
    Type: 'Task',
    Comment: 'Deletes the prevoius server pipeline HelmRelease (Service+Job).',
    Resource: 'arn:aws:states:::eks:call',
    Parameters: {
      ClusterName: context.clusterInfo.name,
      CertificateAuthority: context.clusterInfo.certAuthority,
      Endpoint: context.clusterInfo.endpoint,
      Method: 'DELETE',
      Path: `/apis/helm.fluxcd.io/v1/namespaces/${config.pipelineNamespace}/helmreleases`,
      QueryParameters: {
        labelSelector: [
          'type=pipeline',
        ],
      },
    },
    // TO-DO: remove
    Catch: [
      {
        ErrorEquals: ['EKS.403'],
        ResultPath: '$.error-info',
        Next: step.XNextOnCatch || step.Next,
      },
    ],
  };
};

module.exports = constructDeleteCompletedJobs;
