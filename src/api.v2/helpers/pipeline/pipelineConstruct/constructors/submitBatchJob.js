const config = require('../../../../../config');

const submitBatchJob = (context, step) => {
  const {
    activityArn, podCPUs, podMem,
  } = context;

  const DEFAULT_CPUS = 4;
  const DEFAULT_MEM = 32;
  const cpus = podCPUs || DEFAULT_CPUS;
  const mem = podMem || DEFAULT_MEM;

  return {
    ...step,
    Type: 'Task',
    Resource: 'arn:aws:states:::batch:submitJob',
    Parameters: {
      JobDefinition: 'arn:aws:batch:eu-west-1:242905224710:job-definition/getting-started-job-definition:5',
      JobName: 'step-functions-test-1',
      JobQueue: 'arn:aws:batch:eu-west-1:242905224710:job-queue/getting-started-job-queue',
      ContainerOverrides: {
        Environment: [
          {
            Name: 'ACTIVITY_ARN',
            Value: activityArn,
          },
          {
            Name: 'CLUSTER_ENV',
            Value: config.clusterEnv,
          },
          {
            Name: 'AWS_DEFAULT_REGION',
            Value: config.awsRegion,
          },
          {
            Name: 'AWS_ACCOUNT_ID',
            Value: config.awsAccountId,
          },
          {
            Name: 'SANDBOX_ID',
            Value: config.sandboxId,
          },
        ],
        ResourceRequirements: [
          {
            Type: 'VCPU',
            Value: cpus,
          },
          {
            Type: 'MEMORY',
            Value: mem,
          },
        ],
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

module.exports = submitBatchJob;
