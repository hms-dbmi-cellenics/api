export function deleteCompletedJobs(context: Context, step: MetaStep) {
  const { accountId } = context;

  return {
    ...step,
    Type: 'Task',
    Comment: 'Removes Docker containers with pipeline runs on the local machine.',
    Resource: 'arn:aws:states:::lambda:invoke',
    Parameters: {
      FunctionName: `arn:aws:lambda:eu-west-1:${accountId}:function:remove-previous-pipeline-containers`,
    },
  };
};

