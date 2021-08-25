const config = require('../../../../config');

const patchPod = (context, step) => {
  const {
    clusterInfo, activityArn,
  } = context;

  return {
    ...step,
    Type: 'Task',
    Comment: 'Patch pod XXXX.',
    Resource: 'arn:aws:states:::eks:call',
    Parameters: {
      ClusterName: clusterInfo.name,
      CertificateAuthority: clusterInfo.certAuthority,
      Endpoint: clusterInfo.endpoint,
      Method: 'PATCH',
      Path: `/api/v1/namespaces/${config.pipelineNamespace}/pods/podname`,
      RequestBody: {
        apiVersion: 'helm.fluxcd.io/v1',
        kind: 'HelmRelease',
        meta:
          [
            { op: 'test', path: '/metadata/labels/activityArn', value: null },
            {
              op: 'add', path: '/metadata/labels/activityArn', value: activityArn,
            },
            // {
            //   op: 'add', path: '/metadata/labels/workQueueName', value: service.workQueueName,
            // },
          ],
      },
      //   Path: `/apis/helm.fluxcd.io/v1/namespaces/${config.pipelineNamespace}/helmreleases`,
      //   RequestBody: {
      //     apiVersion: 'helm.fluxcd.io/v1',
      //     kind: 'HelmRelease',
      //     metadata: {
      //       name: releaseName,
      //       namespace: config.pipelineNamespace,
      //       annotations: {
      //         'fluxcd.io/automated': 'true',
      //       },
      //       labels: {
      //         sandboxId: config.sandboxId,
      //         type: 'pipeline',
      //         experimentId,
      //       },
      //     },
      //     spec: {
      //       releaseName,
      //       chart: {
      //         git: 'git@github.com:biomage-ltd/pipeline',
      //         path: 'pipeline-runner/chart',
      //         ref: pipelineArtifacts.chartRef,
      //       },
      //       values: {
      //         experimentId,
      //         image: pipelineArtifacts.pipelineRunner,
      //         namespace: config.pipelineNamespace,
      //         sandboxId: config.sandboxId,
      //         awsAccountId: accountId,
      //         clusterEnv: config.clusterEnv,
      //         awsRegion: config.awsRegion,
      //         activityArn,
      //       },
      //     },
      //   },
      // },
      // Retry: [
      //   {
      //     ErrorEquals: ['EKS.409'],
      //     IntervalSeconds: 1,
      //     BackoffRate: 2.0,
      //     MaxAttempts: 2,
      //   },
      // ],
      // Catch: [
      //   {
      //     ErrorEquals: ['EKS.409'],
      //     ResultPath: '$.error-info',
      //     Next: step.XNextOnCatch || step.Next,
      //   },
      // ],
    },
  };
};

module.exports = patchPod;
