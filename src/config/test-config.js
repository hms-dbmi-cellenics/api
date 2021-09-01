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
  workerInstanceConfigUrl: 'https://raw.githubusercontent.com/biomage-ltd/iac/master/releases/production/worker.yaml',
  // pipelineInstanceConfigUrl: 'https://raw.githubusercontent.com/biomage-ltd/iac/master/releases/production/pipeline.yaml',
  // TODO: remove this line when scaling work is merged and thus the production/pipeline.yaml is
  // updated to new name pipelineRunner
  pipelineInstanceConfigUrl: 'https://raw.githubusercontent.com/biomage-ltd/iac/master/releases/staging-candidates/pipeline/refs-pull-145-merge.yaml',
  api: {
    prefix: '/',
  },
  cachingEnabled: false,
};
