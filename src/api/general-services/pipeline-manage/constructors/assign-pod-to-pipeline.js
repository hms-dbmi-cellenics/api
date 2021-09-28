const config = require('../../../../config');

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

const getRunningPods = (context, step) => {
  const { clusterInfo, experimentId } = context;

  return {
    ...step,
    Type: 'Task',
    Comment: 'Retrieves running pods assigned to the experiment ID.',
    Resource: 'arn:aws:states:::eks:call',
    Parameters: {
      ClusterName: clusterInfo.name,
      CertificateAuthority: clusterInfo.certAuthority,
      Endpoint: clusterInfo.endpoint,
      Method: 'GET',
      Path: `/api/v1/namespaces/${config.pipelineNamespace}/pods`,
      QueryParameters: {
        labelSelector: [
          `experimentId=${experimentId},type=pipeline`,
        ],
        fieldSelector: [
          'status.phase=Running',
        ],
      },
    },
  };
};

const deleteRunningPods = (context, step) => {
  const { clusterInfo } = context;

  return {
    ...step,
    Type: 'Map',
    ItemsPath: '$.runningPods.ResponseBody.items',
    MaxConcurrency: 0,
    Iterator: {
      StartAt: 'DeletePod',
      States: {
        DeletePod: {
          Type: 'Task',
          End: true,
          Comment: 'Patch pod to set the activity ID label.',
          Resource: 'arn:aws:states:::eks:call',
          Parameters: {
            ClusterName: clusterInfo.name,
            CertificateAuthority: clusterInfo.certAuthority,
            Endpoint: clusterInfo.endpoint,
            Method: 'DELETE',
            'Path.$': "States.Format('/api/v1/namespaces/{}/pods/{}', $.metadata.namespace, $.metadata.name)",
          },
          Catch: [
            {
              ErrorEquals: [
                'EKS.404',
              ],
              Next: 'Ignore404',
            },
          ],
        },
        Ignore404: {
          Type: 'Pass',
          End: true,
        },
      },
    },
  };
};

const assignPodToPipeline = (context, step) => {
  const {
    clusterInfo, activityArn, experimentId, processName,
  } = context;

  return {
    ...step,
    Type: 'Map',
    ItemsPath: '$.retries',
    MaxConcurrency: 1,
    // retry waits up to 226 seconds, fargate takes from 1 to 3 minutes to spawn a new pod
    Retry: [{
      ErrorEquals: ['NoPodsAvailable'],
      IntervalSeconds: 2,
      MaxAttempts: 11,
      BackoffRate: 1.5,
    }],
    Iterator: {
      StartAt: 'GetUnassignedPod',
      States: {
        GetUnassignedPod: {
          Next: 'IsPodAvailable',
          Type: 'Task',
          Comment: 'Retrieves first unassigned and running pipeline pod.',
          Resource: 'arn:aws:states:::eks:call',
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
              fieldSelector: [
                'status.phase=Running',
              ],
            },
          },
        },
        IsPodAvailable: {
          Type: 'Choice',
          Comment: 'Redirects to an error state if there are no available pods.',
          Choices: [
            {
              Variable: '$.ResponseBody.items[0]',
              IsPresent: false,
              Next: 'NoPodsAvailable',
            },
          ],
          Default: 'AssignPodToPipeline',
        },
        NoPodsAvailable: {
          Type: 'Fail',
          Cause: 'No available and running pipeline pods.',
          Error: 'NoPodsAvailable',
        },
        AssignPodToPipeline: {
          End: true,
          ResultPath: '$.PatchResult',
          Type: 'Task',
          Comment: 'Patch pod to set the activity ID label.',
          Resource: 'arn:aws:states:::eks:call',
          Parameters: {
            ClusterName: clusterInfo.name,
            CertificateAuthority: clusterInfo.certAuthority,
            Endpoint: clusterInfo.endpoint,
            Method: 'PATCH',
            'Path.$': "States.Format('/api/v1/namespaces/{}/pods/{}', $.ResponseBody.items[0].metadata.namespace, $.ResponseBody.items[0].metadata.name)",
            RequestBody: {
              metadata: {
                labels: {
                  activityId: getActivityId(activityArn),
                  experimentId,
                  processName,
                },

              },
            },
          },
        },
      },
    },
  };
};

module.exports = { getRunningPods, deleteRunningPods, assignPodToPipeline };
