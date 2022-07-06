const config = require('../../../../../config');

const constructDeleteCompletedJobs = (context, step) => {
  const { accountId } = context;

  return {
    ...step,
    Type: 'Task',
    Comment: 'Removes Docker containers with pipeline runs on the local machine.',
    Resource: 'arn:aws:states:::lambda:invoke',
    Parameters: {
      FunctionName: `arn:aws:lambda:${config.awsRegion}:${accountId}:function:remove-previous-pipeline-containers`,
    },
  };
};

module.exports = constructDeleteCompletedJobs;
