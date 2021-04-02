const config = require('../../../../config');

const createNewJobIfNotExist = (context, step) => {
  const {
    clusterInfo, experimentId, pipelineArtifacts, accountId, activityArn,
  } = context;


  if (config.clusterEnv === 'development') {
    return {
      ...step,
      Type: 'Task',
      Resource: 'arn:aws:states:::lambda:invoke',
      Parameters: {
        FunctionName: `arn:aws:lambda:eu-west-1:${accountId}:function:local-container-launcher`,
        Payload: {
          image: 'biomage-qc-runner',
          name: 'pipeline-qc-runner',
          detached: true,
          activityArn,
        },
      },
      Catch: [
        {
          ErrorEquals: ['States.ALL'],
          ResultPath: '$.error-info',
          Next: step.XNextOnCatch || step.Next,
        },
      ],
    };
  }


  return {
    ...step,
    Type: 'Task',
    Comment: 'Attempts to create a Kubernetes Job+Service for the pipeline runner. Will swallow a 409 (already exists) error.',
    Resource: 'arn:aws:states:::eks:call',
    Parameters: {
      ClusterName: clusterInfo.name,
      CertificateAuthority: clusterInfo.certAuthority,
      Endpoint: clusterInfo.endpoint,
      Method: 'POST',
      Path: `/apis/helm.fluxcd.io/v1/namespaces/${config.pipelineNamespace}/helmreleases`,
      RequestBody: {
        apiVersion: 'helm.fluxcd.io/v1',
        kind: 'HelmRelease',
        metadata: {
          name: `pipeline-${experimentId}`,
          namespace: config.pipelineNamespace,
          annotations: {
            'fluxcd.io/automated': 'true',
          },
          labels: {
            sandboxId: config.sandboxId,
            type: 'pipeline',
          },
        },
        spec: {
          releaseName: `pipeline-${experimentId}`,
          chart: {
            git: 'git@github.com:biomage-ltd/pipeline',
            path: 'qc-runner/chart',
            ref: pipelineArtifacts.chartRef,
          },
          values: {
            experimentId,
            image: pipelineArtifacts['qc-runner'],
            namespace: config.pipelineNamespace,
            sandboxId: config.sandboxId,
            awsAccountId: accountId,
            clusterEnv: config.clusterEnv,
            awsRegion: config.awsRegion,
            activityArn,
          },
        },
      },
    },
    Retry: [
      {
        ErrorEquals: ['EKS.409'],
        IntervalSeconds: 1,
        BackoffRate: 2.0,
        MaxAttempts: 2,
      },
    ],
    Catch: [
      {
        ErrorEquals: ['EKS.409'],
        ResultPath: '$.error-info',
        Next: step.XNextOnCatch || step.Next,
      },
    ],
  };
};

module.exports = createNewJobIfNotExist;
