process.env.NODE_ENV = 'test';

module.exports = {
  port: 3000,
  clusterEnv: 'test',
  awsAccountId: '000000000000',
  awsRegion: 'eu-west-1',
  corsOriginUrl: ['https://test.url2.com', 'https://test.url1.com', 'https://test.com'],
  emailDomainName: 'https://test.com',
  domainName: 'test.com',
  podName: 'test',
  sandboxId: 'default',
  workerNamespace: 'worker-test-namespace',
  pipelineNamespace: 'pipeline-test-namespace',
  pipelineInstanceConfigUrl: 'https://raw.githubusercontent.com/test/iac/master/releases/staging/pipeline.yaml',
  workerInstanceConfigUrl: 'https://raw.githubusercontent.com/test/iac/master/releases/production/worker.yaml',
  api: {
    prefix: '/',
  },
  cachingEnabled: false,
  publicApiUrl: 'test-public-api-url',
  pipelineIgnoreSSLCertificate: false,
  datadogApiKey: 'test-datadog-api-key', // pragma: allowlist secret
  datadogAppKey: 'test-datadog-app-key',
  workerVersion: 4, // needs to match workerVersion in UI
};
