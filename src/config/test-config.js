process.env.NODE_ENV = 'test';

function getAwsAccountId() {
  return new Promise((resolve) => {
    resolve('test-account-id');
  });
}

module.exports = {
  port: 3000,
  clusterEnv: 'test',
  awsRegion: 'eu-west-1',
  podName: 'test',
  sandboxId: 'default',
  awsAccountIdPromise: getAwsAccountId(),
  workerNamespace: 'worker-test-namespace',
  pipelineNamespace: 'pipeline-test-namespace',
  workerInstanceConfigUrl: 'https://raw.githubusercontent.com/hms-dbmi-cellenics/iac/master/releases/production/worker.yaml',
  // TODO: remove this line when scaling work is merged into production and thus the
  // production/pipeline.yaml is updated to new name pipelineRunner
  pipelineInstanceConfigUrl: 'https://raw.githubusercontent.com/hms-dbmi-cellenics/iac/master/releases/staging/pipeline.yaml',
  // pipelineInstanceConfigUrl: 'https://raw.githubusercontent.com/hms-dbmi-cellenics/iac/master/releases/production/pipeline.yaml',
  api: {
    prefix: '/',
  },
  cachingEnabled: false,
};
