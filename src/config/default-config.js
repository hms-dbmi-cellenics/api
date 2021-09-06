const dotenv = require('dotenv');
const AWS = require('aws-sdk');
const logger = require('../utils/logging').defaultLogger;

// If we are not deployed on GitLab (AWS/k8s), the environment is given by
// NODE_ENV, or development if NODE_ENV is not set.

// If we are, assign NODE_ENV based on the GitLab (AWS/k8s cluster) environment.
// If NODE_ENV is set, that will take precedence over the GitLab
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

const envFound = dotenv.config();
if (!envFound) {
  throw new Error("Couldn't find .env file");
}

const awsRegion = process.env.AWS_DEFAULT_REGION || 'eu-west-1';

async function getAwsPoolId() {
  const cognitoISP = new AWS.CognitoIdentityServiceProvider({
    region: awsRegion,
  });

  const { UserPools } = await cognitoISP.listUserPools({ MaxResults: 60 }).promise();
  const poolId = UserPools.find((pool) => pool.Name.includes(process.env.CLUSTER_ENV || 'staging')).Id;

  return poolId;
}

async function getAwsAccountId() {
  const sts = new AWS.STS({
    region: awsRegion,
  });

  const data = await sts.getCallerIdentity({}).promise();
  return data.Account;
}

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  clusterEnv: process.env.CLUSTER_ENV || 'development',
  sandboxId: process.env.SANDBOX_ID || 'default',
  podName: process.env.K8S_POD_NAME || 'local',
  workerNamespace: `worker-${process.env.SANDBOX_ID || 'default'}`,
  pipelineNamespace: `pipeline-${process.env.SANDBOX_ID || 'default'}`,
  awsRegion,
  awsAccountIdPromise: getAwsAccountId(),
  awsUserPoolIdPromise: getAwsPoolId(),
  githubToken: process.env.READONLY_API_TOKEN_GITHUB,
  api: {
    prefix: '/',
  },
  workerInstanceConfigUrl: 'https://raw.githubusercontent.com/biomage-ltd/iac/master/releases/production/worker.yaml',
  pipelineInstanceConfigUrl: 'https://raw.githubusercontent.com/biomage-ltd/iac/master/releases/production/pipeline.yaml',
  cachingEnabled: true,
  corsOriginUrl: 'https://scp.biomage.net',
  adminArn: 'a07c6615-d982-413b-9fdc-48bd85182e83',
};


// We are in permanent develop staging environment
if (config.clusterEnv === 'staging' && config.sandboxId === 'default') {
  config.workerInstanceConfigUrl = 'https://raw.githubusercontent.com/biomage-ltd/iac/master/releases/staging/worker.yaml';
  config.pipelineInstanceConfigUrl = 'https://raw.githubusercontent.com/biomage-ltd/iac/master/releases/staging/pipeline.yaml';
  config.cachingEnabled = false;
  config.corsOriginUrl = 'https://ui-default.scp-staging.biomage.net';
  config.adminArn = 'a07c6615-d982-413b-9fdc-48bd85182e83';
}

// We are in user staging environments
if (config.clusterEnv === 'staging' && config.sandboxId !== 'default') {
  config.workerInstanceConfigUrl = `https://raw.githubusercontent.com/biomage-ltd/iac/master/releases/staging/${config.sandboxId}.yaml`;
  config.pipelineInstanceConfigUrl = `https://raw.githubusercontent.com/biomage-ltd/iac/master/releases/staging/${config.sandboxId}.yaml`;
  config.cachingEnabled = false;
  config.corsOriginUrl = `https://ui-${config.sandboxId}.scp-staging.biomage.net`;
  config.adminArn = '70c213d4-e7b6-4920-aefb-706ce8606ee2';
}


// We are in the `development` clusterEnv, meaning we run on
// InfraMock. Set up API accordingly.
if (config.clusterEnv === 'development') {
  const endpoint = 'http://localhost:4566';
  logger.log(`Running development cluster on ${endpoint}, patching AWS to use InfraMock endpoint...`);
  config.cachingEnabled = false;
  config.awsAccountIdPromise = (async () => '000000000000')();
  AWS.config.update({
    endpoint,
    sslEnabled: false,
    s3ForcePathStyle: true,
  });

  config.corsOriginUrl = 'http://localhost:5000';
  config.adminArn = '70c213d4-e7b6-4920-aefb-706ce8606ee2';
}

module.exports = config;
