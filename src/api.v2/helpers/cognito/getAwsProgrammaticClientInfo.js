const config = require('../../../config');
const getAwsPoolId = require('./getAwsPoolId');


async function getAwsProgrammaticClientInfo() {
  const poolId = await getAwsPoolId();
  const params = {
    UserPoolId: poolId,
  };

  const { UserPoolClients } = await config.cognitoISP.listUserPoolClients(params).promise();
  const appClientName = `biomage-programmatic-client-${config.clusterEnv}`;

  const client = UserPoolClients.find((c) => c.ClientName === appClientName);
  if (!client) {
    throw new Error(`getAwsProgrammaticClientInfo: ${appClientName}: not found`);
  }

  return {
    clientId: client.ClientId,
    clientRegion: config.awsRegion,
  };
}

module.exports = getAwsProgrammaticClientInfo;
