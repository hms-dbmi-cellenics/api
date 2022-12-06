const { QC_PROCESS_NAME, GEM2S_PROCESS_NAME, SUBSET_PROCESS_NAME } = require('../../../../constants');
const getGem2SParams = require('./paramsGetters/getGem2sParams');
const getGeneralParams = require('./paramsGetters/getGeneralParams');
const getQCParams = require('./paramsGetters/getQCParams');
const getSubsetParams = require('./paramsGetters/getSubsetParams');

const buildParams = (context, stepArgs) => {
  let processParams;

  if (context.processName === QC_PROCESS_NAME) {
    processParams = getQCParams(context, stepArgs);
  } else if (context.processName === GEM2S_PROCESS_NAME) {
    processParams = getGem2SParams(context);
  } else if (context.processName === SUBSET_PROCESS_NAME) {
    processParams = getSubsetParams(context, stepArgs);
  }

  return {
    ...getGeneralParams(stepArgs.taskName, context),
    ...processParams,
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
    ...!step.End && { Next: step.XNextOnCatch || step.Next },
  };
};

module.exports = createNewStep;
