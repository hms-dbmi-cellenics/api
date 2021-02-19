/* eslint-disable global-require */
const AWSXRay = require('aws-xray-sdk');
const config = require('../config');

let AWS;

if (config.clusterEnv === 'test' || config.clusterEnv === 'development' || process.env.JEST_WORKER_ID) {
  AWS = require('aws-sdk');
} else {
  AWS = AWSXRay.captureAWS(require('aws-sdk'));
}

module.exports = AWS;
