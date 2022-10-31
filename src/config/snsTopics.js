const config = require('.');

const toArn = (topic, sandboxId = config.sandboxId) => (
  `arn:aws:sns:${config.awsRegion}:${config.awsAccountId}:${topic}-${config.clusterEnv}-${sandboxId}-v2`
);

module.exports = {
  WORK_RESULTS: toArn('work-results'),
  POST_REGISTRATION: toArn('post-registration-user-access', 'default'),
};
