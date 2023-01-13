const config = require('../../../config');
const getAwsPoolId = require('./getAwsPoolId');
const { NotFoundError } = require('../../../utils/responses');


async function getAwsProgrammaticClientInfo() {
  const poolId = await getAwsPoolId();
  const params = {
    UserPoolId: poolId,
  };

  const { UserPoolClients } = await config.cognitoISP.listUserPoolClients(params).promise();

  // we use k8s_env instead of config.clusterEnv so that when running in local
  // we will use staging because K8S_ENV will be undefined
  const k8sEnv = process.env.K8S_ENV || 'staging';
  const appClientName = `biomage-programmatic-client-${k8sEnv}`;

  const client = UserPoolClients.find((c) => c.ClientName === appClientName);
  if (!client) {
    throw new NotFoundError(`getAwsProgrammaticClientInfo: cognito client ${appClientName}: not found`);
  }

  return {
    clientId: client.ClientId,
    clientRegion: config.awsRegion,
  };
}

module.exports = getAwsProgrammaticClientInfo;
