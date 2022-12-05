const config = require('../../../../../config');
const { QC_PROCESS_NAME, GEM2S_PROCESS_NAME, SEURAT_PROCESS_NAME } = require('../../../../constants');

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

const getSeuratParams = (task, context) => {
  const { taskParams } = context;
  return {
    ...task,
    ...taskParams,
  };
};


const buildParams = (task, context, stepArgs) => {
  let processParams;

  if (task.processName === QC_PROCESS_NAME) {
    processParams = getQCParams(task, context, stepArgs);
  } else if (task.processName === GEM2S_PROCESS_NAME) {
    processParams = getGem2SParams(task, context);
  } else if (task.processName === SEURAT_PROCESS_NAME) {
    processParams = getSeuratParams(task, context);
  }

  return {
    ...task,
    ...processParams,
  };
};

const createNewStep = (context, step, stepArgs) => {
  const { activityArn } = context;
  const { taskName } = stepArgs;
  const task = createTask(taskName, context);
  const params = buildParams(task, context, stepArgs);

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
