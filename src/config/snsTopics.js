const config = require('.');

// WithV2 won't be necessary if we remove the -v2 from the sns topic for the worker-results topics
const toArn = (topic, sandboxId = config.sandboxId, withV2) => (
  `arn:aws:sns:${config.awsRegion}:${config.awsAccountId}:${topic}-${config.clusterEnv}-${sandboxId}${withV2 ? '-v2' : ''}`
);

module.exports = {
  WORK_RESULTS: toArn('work-results', true),
  POST_REGISTRATION: toArn('post-registration-user-access', 'default', false),
};
