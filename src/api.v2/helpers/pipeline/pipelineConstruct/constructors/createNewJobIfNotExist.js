const config = require('../../../../../config');

const createNewLocalJobIfNotExist = (context, step) => {
  const {
    accountId, clusterInfo, pipelineArtifacts, experimentId, activityArn, processName,
  } = context;

  const MAX_HELMRELEASE_NAME_LENGTH = 53;
  const releaseName = `${processName}-${experimentId}`.substring(0, MAX_HELMRELEASE_NAME_LENGTH - 1);

  console.log('pipeline-artifacts');
  console.log(pipelineArtifacts);
  console.log('clusterInfo');
  console.log(clusterInfo);
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
          name: releaseName,
          namespace: config.pipelineNamespace,
          annotations: {
            'fluxcd.io/automated': 'true',
          },
          labels: {
            sandboxId: config.sandboxId,
            type: 'pipeline',
            experimentId,
          },
        },
        spec: {
          releaseName,
          chart: {
            git: 'git@github.com:biomage-ltd/pipeline',
            path: 'chart-infra-xl/',
            ref: pipelineArtifacts.chartRef,
          },
          values: {
            experimentId,
            image: pipelineArtifacts.pipelineRunner,
            namespace: config.pipelineNamespace,
            sandboxId: config.sandboxId,
            clusterEnv: config.clusterEnv,
            awsRegion: config.awsRegion,
            myAccount: {
              accountId,
            },
            serviceAccount: {
              iamRole: `pipeline-role-${config.clusterEnv}`,
            },
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

module.exports = createNewLocalJobIfNotExist;
