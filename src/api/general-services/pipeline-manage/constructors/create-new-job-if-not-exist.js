const config = require('../../../../config');

const createNewJobIfNotExist = (context, step) => {
  const {
    clusterInfo, experimentId, pipelineImage, accountId,
  } = context;


  if (config.clusterEnv === 'development') {
    return {
      ...step,
      Type: 'Task',
      Resource: 'arn:aws:states:::lambda:invoke',
      Parameters: {
        FunctionName: `arn:aws:lambda:eu-west-1:${accountId}:function:local-container-launcher`,
        Payload: {
          image: pipelineImage,
          name: 'pipeline-remoter-server',
        },
      },
    };
  }


  return {
    ...step,
    Type: 'Task',
    Comment: 'Attempts to create a Kubernetes Job for the pipeline server. Will swallow a 409 (already exists) error.',
    Resource: 'arn:aws:states:::eks:call',
    Parameters: {
      ClusterName: clusterInfo.name,
      CertificateAuthority: clusterInfo.certAuthority,
      Endpoint: clusterInfo.endpoint,
      Method: 'POST',
      Path: `/apis/batch/v1/namespaces/${config.namespace}/jobs`,
      RequestBody: {
        apiVersion: 'batch/v1',
        kind: 'Job',
        metadata: {
          name: `remoter-server-${experimentId}`,
        },
        spec: {
          template: {
            metadata: {
              name: `remoter-server-${experimentId}`,
            },
            spec: {
              containers: [
                {
                  name: 'remoter-server',
                  image: pipelineImage,
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

module.exports = createNewJobIfNotExist;
