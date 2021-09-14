import config from '../../../../config';
const { QC_PROCESS_NAME, GEM2S_PROCESS_NAME } = require('../constants');

const createTask = (taskName: string, context: Context) => {
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

const getQCParams = (task: Task, stepArgs: StepArgs) => {
  const { perSample, uploadCountMatrix } = stepArgs;
  return {
    ...task,
    ...perSample ? { 'sampleUuid.$': '$.sampleUuid' } : { sampleUuid: '' },
    ...uploadCountMatrix ? { uploadCountMatrix: true } : { uploadCountMatrix: false },
  };
};

const getGem2SParams = (task: Task, context: Context) => {
  const { taskParams } = context;
  return {
    ...task,
    ...taskParams,
  };
};


const buildParams = (task: Task, context: Context, stepArgs: StepArgs) => {
  let processParams;

  if (task.processName === QC_PROCESS_NAME) {
    processParams = getQCParams(task, stepArgs);
  } else if (task.processName === GEM2S_PROCESS_NAME) {
    processParams = getGem2SParams(task, context);
  }

  return {
    ...task,
    ...processParams,
  };
};

const createNewStep = (context: Context, step: MetaStep, stepArgs: StepArgs) => {
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
    Parameters: params,
    ...!step.End && { Next: step.XNextOnCatch || step.Next },
  };
};

export { createNewStep };
