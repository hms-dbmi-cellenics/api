/* eslint-disable global-require */
const AWSXRay = require('aws-xray-sdk');

let AWS;

if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
  AWS = require('aws-sdk');
} else {
  AWS = AWSXRay.captureAWS(require('aws-sdk'));
}

/**
 * For some incomprehensible reason the AWS SDK by default does not use
 * its "default" set of providers, but instead a slimmed down version.
 *
 * This is a problem because our provider (TokenFileWebIdentityCredentials)
 * is not in this list. This means credentials are fetched every time
 * a new client is created, which adds an extra 600ms to all our requests.
 * See here:
 *  https://github.com/aws/aws-sdk-js/blob/307e82673b48577fce4389e4ce03f95064e8fe0d/lib/node_loader.js#L76
 *
 * We do this thing's job explicitly to fix the problem.
 */

if (!AWS.config.credentials || (AWS.config.credentials && AWS.config.credentials.expired)) {
  const chain = new AWS.CredentialProviderChain();

  chain.resolve((err, cred) => {
    if (!err) { AWS.config.credentials = cred; }
  });
}

module.exports = AWS;
