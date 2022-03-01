const config = require('../../../../../config');
const constants = require('../pipelineConstants');


// the full activityArn is too long to be used as a tag (> 63 chars)
// so we just send the last part of the arn as the rest can be constructed.
//  E.g.
// arn:aws:states:eu-west-1:242905224710:activity:pipeline-production-01037a63-a801-4ea4-a93e-...
// => pipeline-production-01037a63-a801-4ea4-a93e-def76c1e5bd2
const getActivityId = (activityArn) => {
  const split = activityArn.split(':');
  return split[split.length - 1];
};

const buildPodRequest = (sandboxId, experimentId, taskName, processName, activityId) => ({
  taskName,
  experimentId,
  input: {
    experimentId, // remove once PipelineResponse.v1.yaml is refactored with gem2s one
    sandboxId,
    activityId,
    processName,
  },
});


const requestPod = (context, step) => {
  const {
    environment, accountId, sandboxId, activityArn, experimentId, processName,
  } = context;
  const activityId = getActivityId(activityArn);

  const requestPodMessage = buildPodRequest(sandboxId,
    experimentId,
    constants.ASSIGN_POD_TO_PIPELINE,
    processName,
    activityId);

  return {
    ...step,
    Comment: 'Send a message through SNS so that the API assigns a pod to the pipeline',
    Type: 'Task',
    Resource: 'arn:aws:states:::sns:publish',
    Parameters: {
      TopicArn: `arn:aws:sns:${config.awsRegion}:${accountId}:work-results-${environment}-${sandboxId}`,
      Message: JSON.stringify(requestPodMessage),
      MessageAttributes: {
        type: {
          DataType: 'String',
          StringValue: 'PipelineResponse',
        },
      },
    },

  };
};

module.exports = {
  buildPodRequest,
  requestPod,
};
