const config = require('../../../../config');

const createNewStep = (context, step, args) => {
  const {
    processingConfig, experimentId, activityArn,
  } = context;

  const { taskName, perSample } = args;
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
    TimeoutSeconds: 600,
    Parameters: {
      ...task,
      ...perSample ? { 'sampleUuid.$': '$.sampleUuid' } : { sampleUuid: '' },
    },
    ...!step.End && { Next: step.XNextOnCatch || step.Next },
  };
};

module.exports = createNewStep;
