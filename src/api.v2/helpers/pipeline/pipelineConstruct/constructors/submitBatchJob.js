const config = require('../../../../../config');

const submitBatchJob = (context, step) => {
  const {
    activityArn, podCpus, podMemory, processName, environment, experimentId,
  } = context;

  const DEFAULT_CPUS = 2;
  const DEFAULT_MEM = 8192; // MiB
  const cpus = podCpus || DEFAULT_CPUS;
  const mem = podMemory || DEFAULT_MEM;

  return {
    ...step,
    Type: 'Task',
    Resource: 'arn:aws:states:::batch:submitJob',
    Parameters: {
      JobDefinition: `job-pipeline-${environment}`,
      JobName: `${environment}-${experimentId}-${processName}`, // changing the name will break job termination when a new one is submitted
      JobQueue: `queue-pipeline-${environment}`,
      ContainerOverrides: {
        Command: ['./start-batch.sh'],
        Environment: [
          {
            Name: 'EXPERIMENT_ID',
            Value: `${experimentId}`,
          },
          {
            Name: 'ACTIVITY_ARN',
            Value: `${activityArn}`,
          },
          {
            Name: 'CLUSTER_ENV',
            Value: `${config.clusterEnv}`,
          },
          {
            Name: 'AWS_DEFAULT_REGION',
            Value: `${config.awsRegion}`,
          },
          {
            Name: 'AWS_ACCOUNT_ID',
            Value: `${config.awsAccountId}`,
          },
          {
            Name: 'SANDBOX_ID',
            Value: `${config.sandboxId}`,
          },
          {
            Name: 'BATCH',
            Value: 'true',
          },
          {
            Name: 'DOMAIN_NAME',
            Value: `${config.domainName}`,
          },
          {
            Name: 'DD_API_KEY',
            Value: `${config.datadogApiKey}`,
          },
          {
            Name: 'DD_APP_KEY',
            Value: `${config.datadogAppKey}`,
          },
        ],
        ResourceRequirements: [
          {
            Type: 'VCPU',
            Value: `${cpus}`,
          },
          {
            Type: 'MEMORY',
            Value: `${mem}`,
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
