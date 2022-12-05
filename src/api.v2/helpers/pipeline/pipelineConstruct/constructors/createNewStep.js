const config = require('../../../../../config');
const { QC_PROCESS_NAME, GEM2S_PROCESS_NAME } = require('../../../../constants');

const createTask = (taskName, context) => {
  const {
    projectId, processingConfig, experimentId, processName,
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
    config: processingConfig[taskName] || {},
    server: remoterServer,
  };

  console.log('taskDebug');
  console.log(task);

  return task;
};

const getQCParams = (task, context, stepArgs) => {
  const { perSample, uploadCountMatrix } = stepArgs;
  return {
    ...task,
    ...perSample ? { 'sampleUuid.$': '$.sampleUuid' } : { sampleUuid: '' },
    ...uploadCountMatrix ? { uploadCountMatrix: true } : { uploadCountMatrix: false },
    authJWT: context.authJWT,
  };
};

const getGem2SParams = (task, context) => {
  const { taskParams } = context;
  return {
    ...task,
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
  const { taskName } = stepArgs;

  let processParams;

  const task = createTask(taskName, context);

  if (task.processName === QC_PROCESS_NAME) {
    processParams = getQCParams(task, context, stepArgs);
  } else if (task.processName === GEM2S_PROCESS_NAME) {
    processParams = getGem2SParams(task, context);
  }

  return {
    ...task,
    ...processParams,
  };
};

const createNewStep = (context, step, stepArgs) => {
  const { activityArn } = context;

  const params = buildParams(context, stepArgs);

  console.log('paramsDebug');
  console.log(JSON.stringify(context));
  console.log(JSON.stringify(step));
  console.log();

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
