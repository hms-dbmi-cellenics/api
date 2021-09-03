
export function createNewJobIfNotExist (context: Context, step: MetaStep): Step {
  const { accountId, activityArn, processName } = context;

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
};