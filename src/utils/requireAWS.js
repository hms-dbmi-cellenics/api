/* eslint-disable global-require */
const AWSXRay = require('aws-xray-sdk');

let AWS;

if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
  AWS = require('aws-sdk');
} else {
  AWS = AWSXRay.captureAWS(require('aws-sdk'));
}

module.exports = AWS;
