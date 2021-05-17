const config = require('../../../../config');
const { PIPELINE_PROCESS_NAME, GEM2S_PROCESS_NAME } = require('../constants');

const createTask = (taskName, context) => {
  // TODO fill-in projectId
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

  return task;
};

const getQCParams = (task, context) => {
  const { perSample, uploadCountMatrix } = context;
  return {
    ...task,
    ...perSample ? { 'sampleUuid.$': '$.sampleUuid' } : { sampleUuid: '' },
    ...uploadCountMatrix ? { uploadCountMatrix: true } : { uploadCountMatrix: false },
  };
};

const getGem2SParams = (task, context) => {
  const { taskParams } = context;
  return {
    ...task,
    ...taskParams,
  };
};


const buildParams = (task, context) => {
  let processParams;

  if (task.processName === PIPELINE_PROCESS_NAME) {
    processParams = getQCParams(task, context);
  } else if (task.processName === GEM2S_PROCESS_NAME) {
    processParams = getGem2SParams(task, context);
  }

  return {
    ...task,
    ...processParams,
  };
};

const createNewStep = (context, step, args) => {
  // const {
  //   processingConfig, experimentId, activityArn, processName,
  // } = context;

  // const remoterServer = (
  //   config.clusterEnv === 'development'
  // ) ? 'host.docker.internal'
  //   : `remoter-server-${experimentId}.${config.pipelineNamespace}.svc.cluster.local`;

  const { activityArn } = context;
  const { taskName } = args;
  // const { taskName, perSample, uploadCountMatrix } = args;

  const task = createTask(taskName, context);

  const params = buildParams(task, context);
  // const task = {
  //   experimentId,
  //   taskName,
  //   processName,
  //   config: processingConfig[taskName] || {},
  //   server: remoterServer,
  // };

  return {
    ...step,
    Type: 'Task',
    Resource: activityArn,
    ResultPath: null,
    TimeoutSeconds: 3600,
    Parameters: params,
    // {
    //   ...task,
    //   ...perSample ? { 'sampleUuid.$': '$.sampleUuid' } : { sampleUuid: '' },
    //   ...uploadCountMatrix ? { uploadCountMatrix: true } : { uploadCountMatrix: false },
    // },
    ...!step.End && { Next: step.XNextOnCatch || step.Next },
  };
};

module.exports = createNewStep;
