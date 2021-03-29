const crypto = require('crypto');
const config = require('../../../../config');

const createNewStep = (context, step, args) => {
  const {
    processingConfig, clusterInfo, experimentId, pipelineArtifacts, accountId,
  } = context;

  const { taskName, perSample } = args;
  const remoterServer = (
    config.clusterEnv === 'development'
  ) ? 'host.docker.internal'
    : `remoter-server-${experimentId}.${config.pipelineNamespace}.svc.cluster.local`;

  const task = JSON.stringify({
    experimentId,
    taskName,
    config: processingConfig[taskName] || {},
    server: remoterServer,
  });

  // If enabled is defined and is false.
  if (config.enabled === false) {
    return {
      ...step,
      Type: 'Pass',
      ResultPath: null,

    };
  }

  const stepHash = crypto.randomBytes(5).toString('hex');

  if (config.clusterEnv === 'development') {
    return {
      ...step,
      Type: 'Task',
      Resource: 'arn:aws:states:::lambda:invoke',
      // TODO: fix this, add some of old output
      // see https://docs.aws.amazon.com/step-functions/latest/dg/input-output-resultpath.html
      ResultPath: null,
      Parameters: {
        FunctionName: `arn:aws:lambda:eu-west-1:${accountId}:function:local-container-launcher`,
        Payload: {
          image: 'biomage-remoter-client',
          name: 'pipeline-remoter-client',
          task,
          ...perSample && { 'sampleUuid.$': '$.sampleUuid' },
          detached: false,
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
    Comment: 'Attempts to create a Kubernetes Job for the pipeline server. Will swallow a 409 (already exists) error.',
    Resource: 'arn:aws:states:::eks:runJob.sync',
    // TODO: fix this, add some of old output
    // see https://docs.aws.amazon.com/step-functions/latest/dg/input-output-resultpath.html
    ResultPath: null,
    Parameters: {
      ClusterName: clusterInfo.name,
      CertificateAuthority: clusterInfo.certAuthority,
      Endpoint: clusterInfo.endpoint,
      Namespace: config.pipelineNamespace,
      LogOptions: {
        RetrieveLogs: true,
      },
      Job: {
        apiVersion: 'batch/v1',
        kind: 'Job',
        metadata: {
          ...perSample && { 'name.$': `States.Format('remoter-client-${stepHash}-{}', $.index)` },
          ...!perSample && { name: `remoter-client-${stepHash}` },
          labels: {
            sandboxId: config.sandboxId,
            experimentId,
            taskName,
            type: 'pipeline',
          },
        },
        spec: {
          template: {
            metadata: {
              ...perSample && { 'name.$': `States.Format('remoter-client-${stepHash}-{}', $.index)` },
              ...!perSample && { name: `remoter-client-${stepHash}` },
              labels: {
                sandboxId: config.sandboxId,
                type: 'pipeline',
              },
            },
            spec: {
              containers: [
                {
                  name: 'remoter-client',
                  image: pipelineArtifacts['remoter-client'],
                  args: [
                    task,
                  ],
                  env: [
                    ...perSample ? [{ name: 'SAMPLE_ID', 'value.$': '$.sampleUuid' }] : [],
                  ],
                },
              ],
              restartPolicy: 'Never',
            },
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

module.exports = createNewStep;
