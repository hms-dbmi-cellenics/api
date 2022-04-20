const AWS = require('../../../utils/requireAWS');
const config = require('../../../config');

const bucketNames = require('./bucketNames');

const getSignedUrl = (operation, params) => {
  if (!params.Bucket) throw new Error('Bucket is required');
  if (!params.Key) throw new Error('Key is required');

  const S3Config = {
    apiVersion: '2006-03-01',
    signatureVersion: 'v4',
    region: config.awsRegion,
  };

  const s3 = new AWS.S3(S3Config);

  return s3.getSignedUrl(operation, params);
};

const getSampleFileUploadUrl = (sampleFileId, fileType, cellrangerVersion) => {
  const params = {
    Bucket: bucketNames.SAMPLE_FILES,
    Key: `${sampleFileId}/${fileType}`,
    // 1 hour timeout of upload link
    Expires: 3600,
  };

  if (cellrangerVersion) {
    params.Metadata = {
      cellranger_version: cellrangerVersion,
    };
  }

  const signedUrl = getSignedUrl('putObject', params);

  return signedUrl;
};

module.exports = { getSampleFileUploadUrl, getSignedUrl };
