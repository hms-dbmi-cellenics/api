const config = require('../../../../../config');
const { getActivityId } = require('../utils');

const buildErrorMessage = (
  sandboxId,
  experimentId,
  taskName,
  processName,
  activityId,
  authJWT,
) => ({
  taskName,
  experimentId,
  apiUrl: config.publicApiUrl,
  input: {
    authJWT,
    experimentId,
    sandboxId,
    activityId,
    processName,
  },
});

const createHandleErrorStep = (context, step, args) => {
  console.log('*** context', context);
  console.log('*** args', args);
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
    errorType,
    processName,
    activityId,
    authJWT,
  );

  console.log('*** errorMessage', errorMessage);

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
    ...!step.End && { Next: step.Next },
  };
};

module.exports = createHandleErrorStep;
