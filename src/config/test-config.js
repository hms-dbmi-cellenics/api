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
  workerInstanceConfigUrl: 'https://raw.githubusercontent.com/biomage-ltd/iac/master/charts/worker-instance.yaml',
  api: {
    prefix: '/',
  },
  cachingEnabled: false,
};
