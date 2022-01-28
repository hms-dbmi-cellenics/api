const githubOrganisationName = 'hms-dbmi-cellenics';

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
  pipelineInstanceConfigUrl: `https://raw.githubusercontent.com/${githubOrganisationName}/iac/master/releases/staging/pipeline.yaml`,
  workerInstanceConfigUrl: `https://raw.githubusercontent.com/${githubOrganisationName}/iac/master/releases/production/worker.yaml`,
  api: {
    prefix: '/',
  },
  cachingEnabled: false,
};