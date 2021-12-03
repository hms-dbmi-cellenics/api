const AWS = require('aws-sdk');
const config = require('../config');

const getS3SignedUrl = (operation, params) => {
  const s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    signatureVersion: 'v4',
    region: config.awsRegion,
  });

  const defaultParams = {
    Expires: 300, // seconds; default to 5 mins
  };

  if (!params.Bucket) throw new Error('Bucket is required');
  if (!params.Key) throw new Error('Key is required');

  const requestParms = {
    ...defaultParams,
    ...params,
  };

  return s3.getSignedUrl(operation, requestParms);
};

module.exports = getS3SignedUrl;
