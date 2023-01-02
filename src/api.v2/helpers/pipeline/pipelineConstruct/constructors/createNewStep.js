const { QC_PROCESS_NAME, GEM2S_PROCESS_NAME, SUBSET_PROCESS_NAME } = require('../../../../constants');
const getGeneralParams = require('./paramsGetters/getGeneralParams');
const getQCParams = require('./paramsGetters/getQCParams');
const getSubsetParams = require('./paramsGetters/getSubsetParams');
const { HANDLE_TIMEOUT_ERROR_STEP } = require('../../../../constants');

const buildParams = (context, stepArgs) => {
  let stepParams;

  if (context.processName === QC_PROCESS_NAME) {
    stepParams = getQCParams(context, stepArgs);
  } else if (context.processName === GEM2S_PROCESS_NAME) {
    stepParams = context.taskParams;
  } else if (context.processName === SUBSET_PROCESS_NAME) {
    stepParams = getSubsetParams(context, stepArgs);
  }

  return {
    ...getGeneralParams(stepArgs.taskName, context),
    ...stepParams,
  };
};

const createNewStep = (context, step, stepArgs) => {
  const { activityArn } = context;

  const params = buildParams(context, stepArgs);

  return {
    ...step,
    Type: 'Task',
    Resource: activityArn,
    ResultPath: null,
    TimeoutSeconds: 10800,
    HeartbeatSeconds: 90,
    Parameters: params,
    ...!step.End && { Next: step.Next },
    Catch: [
      {
        ErrorEquals: ['States.Timeout'],
        ResultPath: '$.error-info',
        Next: HANDLE_TIMEOUT_ERROR_STEP,
      },
    ],
  };
};

module.exports = createNewStep;
