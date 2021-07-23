const { createTask, buildParams } = require('./create-new-step');

const sendNoOutput = (context, step, stepArgs) => {
  // const { activityArn } = context;
  const { taskName } = stepArgs;
  const task = createTask(taskName, context); // check if these are the right ones
  // const params = buildParams(task, context, stepArgs); // check if these are the right ones

  // modify this return for the proper message
  // return {
  //   ...step,
  //   Type: 'Task',
  //   Resource: activityArn,
  //   ResultPath: null,
  //   TimeoutSeconds: 3600,
  //   Parameters: params,
  //   ...!step.End && { Next: step.XNextOnCatch || step.Next },
  // };
};
module.exports = sendNoOutput;
