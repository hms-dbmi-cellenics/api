const config = require('../../../../config');

const createNewStep = (context, step, args) => {
  const {
    processingConfig, experimentId, activityArn,
  } = context;

  const { taskName, perSample, uploadCountMatrix } = args;
  const remoterServer = (
    config.clusterEnv === 'development'
  ) ? 'host.docker.internal'
    : `remoter-server-${experimentId}.${config.pipelineNamespace}.svc.cluster.local`;


  const task = {
    experimentId,
    taskName,
    config: processingConfig[taskName] || {},
    server: remoterServer,
  };

  return {
    ...step,
    Type: 'Task',
    Resource: activityArn,
    ResultPath: null,
    TimeoutSeconds: 3600,
    Parameters: {
      ...task,
      ...perSample ? { 'sampleUuid.$': '$.sampleUuid' } : { sampleUuid: '' },
      ...uploadCountMatrix ? { uploadCountMatrix: true } : { uploadCountMatrix: false },
    },
    ...!step.End && { Next: step.XNextOnCatch || step.Next },
  };
};

module.exports = createNewStep;
