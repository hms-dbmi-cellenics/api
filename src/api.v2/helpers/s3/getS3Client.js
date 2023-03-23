const AWS = require('../../../utils/requireAWS');
const config = require('../../../config');

// Wanted to make this a wrapper class that extends S3,
// but it's not advisable to do so:
// https://github.com/aws/aws-sdk-js/issues/2006
const getS3Client = (options) => {
  const S3Config = {
    apiVersion: '2006-03-01',
    signatureVersion: 'v4',
    region: config.awsRegion,
    maxRetries: 3,
    ...options,
  };

  return new AWS.S3(S3Config);
};

module.exports = getS3Client;
