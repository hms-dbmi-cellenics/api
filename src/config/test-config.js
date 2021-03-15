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
  workerInstanceConfigUrl: 'https://raw.githubusercontent.com/biomage-ltd/iac/master/releases/production/worker.yaml',
  pipelineInstanceConfigUrl: 'http://127.0.0.1:8080/pipeline.yaml',
  api: {
    prefix: '/',
  },
  cachingEnabled: false,
};
