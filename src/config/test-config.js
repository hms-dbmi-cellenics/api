const githubOrganisationName = 'hms-dbmi-cellenics';

process.env.NODE_ENV = 'test';

module.exports = {
  port: 3000,
  clusterEnv: 'test',
  awsAccountId: '000000000000',
  awsRegion: 'eu-west-1',
  corsOriginUrl: 'https://scp.biomage.net',
  domainName: 'scp.biomage.net',
  podName: 'test',
  sandboxId: 'default',
  adminSub: 'mockAdminSub',
  workerNamespace: 'worker-test-namespace',
  pipelineNamespace: 'pipeline-test-namespace',
  pipelineInstanceConfigUrl: `https://raw.githubusercontent.com/${githubOrganisationName}/iac/master/releases/staging/pipeline.yaml`,
  workerInstanceConfigUrl: `https://raw.githubusercontent.com/${githubOrganisationName}/iac/master/releases/production/worker.yaml`,
  api: {
    prefix: '/',
  },
  cachingEnabled: false,
};
