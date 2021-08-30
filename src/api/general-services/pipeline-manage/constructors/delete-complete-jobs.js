const config = require('../../../../config');

const constructDeleteCompletedJobs = (context, step) => {
  const { accountId } = context;

  if (config.clusterEnv === 'development') {
    return {
      ...step,
      Type: 'Task',
      Comment: 'Removes Docker containers with pipeline runs on the local machine.',
      Resource: 'arn:aws:states:::lambda:invoke',
      Parameters: {
        FunctionName: `arn:aws:lambda:eu-west-1:${accountId}:function:remove-previous-pipeline-containers`,
      },
    };
  }

  throw Error(`constructDeleteCompletedJobs should only be called in local environment, current env: ${config.clusterEnv}`);
};

module.exports = constructDeleteCompletedJobs;
