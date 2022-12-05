const config = require('../../../../../config');
const { QC_PROCESS_NAME, GEM2S_PROCESS_NAME } = require('../../../../constants');

const getGeneralParams = (taskName, context) => {
  const {
    projectId, experimentId, processName,
  } = context;

  const remoterServer = (
    config.clusterEnv === 'development'
  ) ? 'host.docker.internal'
    : `remoter-server-${experimentId}.${config.pipelineNamespace}.svc.cluster.local`;

  const task = {
    projectId,
    experimentId,
    taskName,
    processName,
    server: remoterServer,
  };

  return task;
};

const getQCParams = (context, stepArgs) => {
  const { perSample, uploadCountMatrix, taskName } = stepArgs;

  return {
    ...getGeneralParams(taskName, context),
    ...perSample ? { 'sampleUuid.$': '$.sampleUuid' } : { sampleUuid: '' },
    ...uploadCountMatrix ? { uploadCountMatrix: true } : { uploadCountMatrix: false },
    authJWT: context.authJWT,
    config: context.processingConfig[taskName] || {},
  };
};

const getGem2SParams = (context, stepArgs) => {
  const { taskParams } = context;
  const { taskName } = stepArgs;

  return {
    ...getGeneralParams(taskName, context),
    ...taskParams,
  };
};

// const getSubsetParams = (task, context) => {
//   // console.log('taskDebug');
//   // console.log(task);
//   // // const { taskParams } = context;

//   // return {};
// };

const buildParams = (context, stepArgs) => {
  let processParams;

  if (context.processName === QC_PROCESS_NAME) {
    processParams = getQCParams(context, stepArgs);
  } else if (context.processName === GEM2S_PROCESS_NAME) {
    processParams = getGem2SParams(context, stepArgs);
  }

  return { ...processParams };
};

const createNewStep = (context, step, stepArgs) => {
  const { activityArn } = context;

  const params = buildParams(context, stepArgs);

  console.log('paramsDebug');
  console.log(JSON.stringify(context));
  console.log(JSON.stringify(step));

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
