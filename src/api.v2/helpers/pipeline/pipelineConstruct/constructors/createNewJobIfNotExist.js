const config = require('../../../../../config');
const { HANDLE_ERROR_STEP } = require('../../../../constants');

const createNewJobIfNotExist = (context, step) => {
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
    Catch: [
      {
        ErrorEquals: ['States.ALL'],
        ResultPath: '$.error-info',
        Next: HANDLE_ERROR_STEP,
      },
    ],
  };
};

module.exports = createNewJobIfNotExist;
