const config = require('../../../../config');

const createNewJobIfNotExist = (context, step) => {
  const { accountId, activityArn, processName } = context;


  if (config.clusterEnv === 'development') {
    return {
      ...step,
      Type: 'Task',
      Resource: 'arn:aws:states:::lambda:invoke',
      Parameters: {
        FunctionName: `arn:aws:lambda:eu-west-1:${accountId}:function:local-container-launcher`,
        Payload: {
          image: 'biomage-pipeline-runner',
          name: `${processName}-runner`,
          detached: true,
          activityArn,
        },
      },
      Catch: [
        {
          ErrorEquals: ['States.ALL'],
          ResultPath: '$.error-info',
          Next: step.XNextOnCatch || step.Next,
        },
      ],
    };
  }
  throw Error(`createNewJobIfNotExist should only be called in local environment, current env: ${config.clusterEnv}`);
};

module.exports = createNewJobIfNotExist;
