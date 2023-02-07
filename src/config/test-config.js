const githubOrganisationName = 'hms-dbmi-cellenics';

process.env.NODE_ENV = 'test';

module.exports = {
  port: 3000,
  clusterEnv: 'test',
  awsAccountId: '000000000000',
  awsRegion: 'eu-west-1',
  corsOriginUrl: ['https://test.url2.com', 'https://test.url1.com', 'https://scp.biomage.net'],
  emailDomainName: 'https://scp.biomage.net',
  domainName: 'scp.biomage.net',
  podName: 'test',
  sandboxId: 'default',
  workerNamespace: 'worker-test-namespace',
  pipelineNamespace: 'pipeline-test-namespace',
  pipelineInstanceConfigUrl: `https://raw.githubusercontent.com/${githubOrganisationName}/iac/master/releases/staging/pipeline.yaml`,
  workerInstanceConfigUrl: `https://raw.githubusercontent.com/${githubOrganisationName}/iac/master/releases/production/worker.yaml`,
  api: {
    prefix: '/',
  },
  cachingEnabled: false,
  publicApiUrl: 'test-public-api-url',
  awsBatchIgnoreSSLCertificate: false,
  datadogApiKey: 'test-datadog-api-key',
  datadogAppKey: 'test-datadog-app-key',
};
