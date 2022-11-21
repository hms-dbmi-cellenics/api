const config = require('../../../config');


async function getAwsPoolId() {
  const { UserPools } = await config.cognitoISP.listUserPools({ MaxResults: 60 }).promise();
  // when k8s is undefined we are in development where we use staging user pool so we set
  // it as the default one.
  const k8sEnv = process.env.K8S_ENV || 'staging';
  const userPoolName = `biomage-user-pool-case-insensitive-${k8sEnv}`;

  const pool = UserPools.find((p) => p.Name === userPoolName);
  if (!pool) {
    throw new Error(`getAwsPoolId: ${userPoolName}: not found`);
  }

  return pool.Id;
}


module.exports = getAwsPoolId;
