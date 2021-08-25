const config = require('../../../../config');

const getUnassignedPod = (context, step) => {
  const {
    clusterInfo,
  } = context;


  // const MAX_HELMRELEASE_NAME_LENGTH = 53;
  // const releaseName = `${processName}-${experimentId}`
  // .substring(0, MAX_HELMRELEASE_NAME_LENGTH - 1);

  return {
    ...step,
    Type: 'Task',
    Comment: 'Attempts to create a Kubernetes Job+Service for the pipeline runner.',
    Resource: 'arn:aws:states:::eks:call',
    Parameters: {
      ClusterName: clusterInfo.name,
      CertificateAuthority: clusterInfo.certAuthority,
      Endpoint: clusterInfo.endpoint,
      Method: 'GET',
      Path: `/api/v1/namespaces/${config.pipelineNamespace}/pods`,
      QueryParameters: {
        labelSelector: [
          '!activityArn',
        ],
      },
      // Path: `/apis/helm.fluxcd.io/v1/namespaces/${config.pipelineNamespace}/helmreleases`,
      // RequestBody: {
      //   apiVersion: 'helm.fluxcd.io/v1',
      //   kind: 'HelmRelease',
      //   metadata: {
      //     name: releaseName,
      //     namespace: config.pipelineNamespace,
      //     annotations: {
      //       'fluxcd.io/automated': 'true',
      //     },
      //     labels: {
      //       sandboxId: config.sandboxId,
      //       type: 'pipeline',
      //       experimentId,
      //     },
      //   },
      //   spec: {
      //     releaseName,
      //     chart: {
      //       git: 'git@github.com:biomage-ltd/pipeline',
      //       path: 'pipeline-runner/chart',
      //       ref: pipelineArtifacts.chartRef,
      //     },
      //     values: {
      //       experimentId,
      //       image: pipelineArtifacts.pipelineRunner,
      //       namespace: config.pipelineNamespace,
      //       sandboxId: config.sandboxId,
      //       awsAccountId: accountId,
      //       clusterEnv: config.clusterEnv,
      //       awsRegion: config.awsRegion,
      //       activityArn,
      //     },
      //   },
      // },
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
