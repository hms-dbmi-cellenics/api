const config = require('../../../../../config');
const { PIPELINE_ERROR, HANDLE_TIMEOUT_ERROR_STEP } = require('../../../../constants');
const { getActivityId } = require('../utils');

const buildErrorMessage = (
  sandboxId,
  experimentId,
  taskName,
  processName,
  errorType,
  activityId,
  authJWT,
) => ({
  taskName,
  experimentId,
  apiUrl: config.publicApiUrl,
  input: {
    authJWT,
    experimentId,
    error: errorType,
    taskName,
    sandboxId,
    activityId,
    processName,
  },
});

const createHandleErrorStep = (context, step, args) => {
  const {
    environment,
    accountId,
    sandboxId,
    activityArn,
    experimentId,
    processName,
    authJWT,
  } = context;

  const { errorType } = args;

  const activityId = getActivityId(activityArn);

  const errorMessage = buildErrorMessage(
    sandboxId,
    experimentId,
    PIPELINE_ERROR,
    processName,
    errorType,
    activityId,
    authJWT,
  );

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
          // Publish to pipeline result endpoint
          StringValue: 'PipelineResponse',
        },
      },
    },
    ...!step.End && { Next: step.Next },
  };
};

const timeoutErrorHandler = () => ({
  ErrorEquals: ['States.Timeout'],
  ResultPath: '$.error-info',
  Next: HANDLE_TIMEOUT_ERROR_STEP,
});

module.exports = {
  timeoutErrorHandler,
  createHandleErrorStep,
};
