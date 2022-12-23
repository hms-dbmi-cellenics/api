const config = require('../../../../../config');
const { PIPELINE_ERROR, END_OF_PIPELINE } = require('../../../../constants');
const utils = require('../utils');

const buildErrorMessage = (sandboxId, experimentId, taskName, processName, activityId) => ({
  taskName,
  experimentId,
  // Used by the lambda forwarder to know where to reach the api
  apiUrl: config.publicApiUrl,
  input: {
    experimentId, // remove once PipelineResponse.v1.yaml is refactored with gem2s one
    sandboxId,
    activityId,
    processName,
  },
});

const createHandleErrorStep = (context, step) => {
  const {
    environment, accountId, sandboxId, activityArn, experimentId, processName,
  } = context;

  const activityId = utils.getActivityId(activityArn);

  const errorMessage = buildErrorMessage(sandboxId,
    experimentId,
    PIPELINE_ERROR,
    processName,
    activityId);

  return {
    ...step,
    Type: 'Task',
    Resource: 'arn:aws:states:::sns:publish',
    Parameters: {
      TopicArn: `arn:aws:sns:${config.awsRegion}:${accountId}:work-results-${environment}-${sandboxId}-v2`,
      Message: JSON.stringify(errorMessage),
      MessageAttributes: {
        type: {
          DataType: 'String',
          StringValue: 'PipelineError',
        },
      },
    },
    Next: END_OF_PIPELINE,
  };
};

module.exports = createHandleErrorStep;
