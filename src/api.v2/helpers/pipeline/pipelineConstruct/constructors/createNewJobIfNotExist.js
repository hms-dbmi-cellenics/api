const config = require('../../../../../config');

const createNewJobIfNotExist = (context, step, catchSteps) => {
  const { accountId, activityArn, processName } = context;

  return {
    ...step,
    Type: 'Task',
    Resource: 'arn:aws:states:::lambda:invoke',
    Parameters: {
      FunctionName: `arn:aws:lambda:${config.awsRegion}:${accountId}:function:local-container-launcher`,
      Payload: {
        image: 'biomage-pipeline-runner',
        name: `${processName}-runner`,
        detached: true,
        activityArn,
      },
    },
    Catch: catchSteps,
  };
};

module.exports = createNewJobIfNotExist;
