const config = require('../../../../config');

const createNewStep = (context, step, args) => {
  const {
    processingConfig, clusterInfo, experimentId, pipelineImages, accountId,
  } = context;

  const { taskName } = args;

  const task = JSON.stringify({
    experimentId,
    taskName,
    config: processingConfig[taskName] || {},
  });

  if (config.clusterEnv === 'development') {
    return {
      ...step,
      Type: 'Task',
      Resource: 'arn:aws:states:::lambda:invoke',
      Parameters: {
        FunctionName: `arn:aws:lambda:eu-west-1:${accountId}:function:local-container-launcher`,
        Payload: {
          image: pipelineImages['remoter-client'],
          name: 'pipeline-remoter-client',
          task,
          detached: false,
        },
      },
    };
  }


  return {
    ...step,
    Type: 'Task',
    Comment: 'Attempts to create a Kubernetes Job for the pipeline server. Will swallow a 409 (already exists) error.',
    Resource: 'arn:aws:states:::eks:runJob.sync',
    Parameters: {
      ClusterName: clusterInfo.name,
      CertificateAuthority: clusterInfo.certAuthority,
      Endpoint: clusterInfo.endpoint,
      Method: 'POST',
      Path: `/apis/batch/v1/namespaces/${config.workerNamespace}/jobs`,
      RequestBody: {
        apiVersion: 'batch/v1',
        kind: 'Job',
        metadata: {
          name: `remoter-client-${experimentId}`,
        },
        spec: {
          template: {
            metadata: {
              name: `remoter-client-${experimentId}`,
            },
            spec: {
              containers: [
                {
                  name: 'remoter-client',
                  image: pipelineImages['remoter-client'],
                  args: [
                    task,
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
        Next: step.Next,
      },
    ],
  };
};

module.exports = createNewStep;
