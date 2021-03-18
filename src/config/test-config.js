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
  awsAccountIdPromise: getAwsAccountId,
  workerNamespace: 'worker-test-namespace',
  pipelineNamespace: 'pipeline-test-namespace',
  workerInstanceConfigUrl: 'https://raw.githubusercontent.com/biomage-ltd/iac/master/releases/production/worker.yaml',
  // TODO: to be changed once the merged PR is deployed
  pipelineInstanceConfigUrl: 'https://raw.githubusercontent.com/biomage-ltd/iac/master/releases/staging/xavier-api63-pipeline7-6.yaml',
  api: {
    prefix: '/',
  },
  cachingEnabled: false,
};
