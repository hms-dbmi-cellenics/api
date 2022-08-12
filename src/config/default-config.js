const AWS = require('aws-sdk');
const getLogger = require('../utils/getLogger');

const logger = getLogger();

const githubOrganisationName = 'biomage-org';

// If we are not deployed on Github (AWS/k8s), the environment is given by
// NODE_ENV, or development if NODE_ENV is not set.

// If we are, assign NODE_ENV based on the Github (AWS/k8s cluster) environment.
// If NODE_ENV is set, that will take precedence over the Github
// environment.

if (process.env.K8S_ENV && !process.env.NODE_ENV) {
  switch (process.env.K8S_ENV) {
    case 'staging':
      process.env.NODE_ENV = 'production';
      process.env.CLUSTER_ENV = process.env.K8S_ENV;
      break;
    case 'production':
      process.env.NODE_ENV = 'production';
      process.env.CLUSTER_ENV = process.env.K8S_ENV;

      break;
    default:
      // We are probably on a review branch or other deployment.
      // Default to production for node environment and staging for
      // all cluster services.
      process.env.NODE_ENV = 'production';
      process.env.CLUSTER_ENV = 'staging';
      break;
  }
}

if (!process.env.K8S_ENV) {
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
}

const awsRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'eu-west-1';

const domainName = process.env.DOMAIN_NAME || 'localhost:5000';

const cognitoISP = new AWS.CognitoIdentityServiceProvider({
  region: awsRegion,
});

async function getAwsPoolId() {
  const { UserPools } = await cognitoISP.listUserPools({ MaxResults: 60 }).promise();
  // when k8s is undefined we are in development where we use staging user pool so we set
  // it as the default one.
  const k8sEnv = process.env.K8S_ENV || 'staging';
  const userPoolName = `biomage-user-pool-case-insensitive-${k8sEnv}`;

  const poolId = UserPools.find((pool) => pool.Name === userPoolName).Id;
  return poolId;
}

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  awsAccountId: process.env.AWS_ACCOUNT_ID || '000000000000',
  clusterEnv: process.env.CLUSTER_ENV || 'development',
  sandboxId: process.env.SANDBOX_ID || 'default',
  rdsSandboxId: process.env.RDS_SANDBOX_ID || 'default',
  podName: process.env.K8S_POD_NAME || 'local',
  workerNamespace: `worker-${process.env.SANDBOX_ID || 'default'}`,
  pipelineNamespace: `pipeline-${process.env.SANDBOX_ID || 'default'}`,
  awsRegion,
  domainName,
  awsUserPoolIdPromise: getAwsPoolId(),
  cognitoISP,
  githubToken: process.env.READONLY_API_TOKEN_GITHUB,
  api: {
    prefix: '/',
  },
  workerInstanceConfigUrl: `https://raw.githubusercontent.com/${githubOrganisationName}/iac/master/releases/production/worker.yaml`,
  pipelineInstanceConfigUrl: `https://raw.githubusercontent.com/${githubOrganisationName}/iac/master/releases/production/pipeline.yaml`,
  cachingEnabled: true,
  corsOriginUrl: `https://${domainName}`,
  adminSub: '032abd44-0cd3-4d58-af21-850ca0b95ac7',
};


// We are in permanent develop staging environment
if (config.clusterEnv === 'staging' && config.sandboxId === 'default') {
  config.workerInstanceConfigUrl = `https://raw.githubusercontent.com/${githubOrganisationName}/iac/master/releases/staging/worker.yaml`;
  config.pipelineInstanceConfigUrl = `https://raw.githubusercontent.com/${githubOrganisationName}/iac/master/releases/staging/pipeline.yaml`;
  config.cachingEnabled = false;
  config.corsOriginUrl = `https://ui-default.${domainName}`;
  config.adminSub = '0b17683f-363b-4466-b2e2-5bf11c38a76e';
}

// We are in user staging environments
if (config.clusterEnv === 'staging' && config.sandboxId !== 'default') {
  config.workerInstanceConfigUrl = `https://raw.githubusercontent.com/${githubOrganisationName}/iac/master/releases/staging/${config.sandboxId}.yaml`;
  config.pipelineInstanceConfigUrl = `https://raw.githubusercontent.com/${githubOrganisationName}/iac/master/releases/staging/${config.sandboxId}.yaml`;
  config.cachingEnabled = false;
  config.corsOriginUrl = `https://ui-${config.sandboxId}.${domainName}`;
  config.adminSub = '0b17683f-363b-4466-b2e2-5bf11c38a76e';
}


// We are in the `development` clusterEnv, meaning we run on
// InfraMock. Set up API accordingly.

if (config.clusterEnv === 'development') {
  const endpoint = 'http://localhost:4566';
  logger.log(`Running development cluster on ${endpoint}, patching AWS to use InfraMock endpoint...`);
  config.cachingEnabled = false;
  AWS.config.update({
    endpoint,
    sslEnabled: false,
    s3ForcePathStyle: true,
  });

  config.corsOriginUrl = 'http://localhost:5000';
  config.adminSub = '0b17683f-363b-4466-b2e2-5bf11c38a76e';
}

module.exports = config;
