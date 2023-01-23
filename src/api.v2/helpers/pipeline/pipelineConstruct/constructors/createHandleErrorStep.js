const config = require('../../../../../config');
const { PIPELINE_ERROR, HANDLE_ERROR_STEP } = require('../../../../constants');
const { getActivityId } = require('../utils');

const buildErrorMessage = (
  sandboxId,
  experimentId,
  taskName,
  processName,
  activityId,
  authJWT,
) => {
  let errorMessage = JSON.stringify({
    taskName,
    experimentId,
    apiUrl: config.publicApiUrl,
    input: {
      authJWT,
      experimentId,
      // This is replaced in States.Format
      error: 'INPUT_PLACEHOLDER',
      taskName,
      sandboxId,
      activityId,
      processName,
    },
  });

  // Replace curly braces "{" and "}" with "\{" and "\}" so that it will be correctly
  // parsed by the Step Function's States.Format intrinsic function. For more information refer to
  // https://docs.aws.amazon.com/step-functions/latest/dg/amazon-states-language-intrinsic-functions.html
  errorMessage = errorMessage.replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace('INPUT_PLACEHOLDER', '{}');

  return errorMessage;
};

const createHandleErrorStep = (context, step) => {
  const {
    environment,
    accountId,
    sandboxId,
    activityArn,
    experimentId,
    processName,
    authJWT,
  } = context;

  const activityId = getActivityId(activityArn);

  const errorMessage = buildErrorMessage(
    sandboxId,
    experimentId,
    PIPELINE_ERROR,
    processName,
    activityId,
    authJWT,
  );

  return {
    ...step,
    Type: 'Task',
    Resource: 'arn:aws:states:::sns:publish',
    Parameters: {
      TopicArn: `arn:aws:sns:${config.awsRegion}:${accountId}:work-results-${environment}-${sandboxId}-v2`,
      'Message.$': `States.Format('${errorMessage}', $.errorInfo.Error)`,
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

const createCatchSteps = () => ([
  {
    ErrorEquals: ['States.ALL'],
    ResultPath: '$.errorInfo',
    Next: HANDLE_ERROR_STEP,
  },
]);

module.exports = {
  createCatchSteps,
  createHandleErrorStep,
};
