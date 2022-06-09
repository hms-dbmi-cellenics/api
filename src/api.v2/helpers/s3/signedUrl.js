const _ = require('lodash');

const AWS = require('../../../utils/requireAWS');
const config = require('../../../config');

const bucketNames = require('./bucketNames');
const SampleFile = require('../../model/SampleFile');
const { NotFoundError } = require('../../../utils/responses');

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

const getSampleFileUploadUrl = (sampleFileId, metadata) => {
  const params = {
    Bucket: bucketNames.SAMPLE_FILES,
    Key: `${sampleFileId}`,
    // 1 hour timeout of upload link
    Expires: 3600,
  };

  if (metadata.cellrangerVersion) {
    params.Metadata = {
      cellranger_version: metadata.cellrangerVersion,
    };
  }

  const signedUrl = getSignedUrl('putObject', params);

  return signedUrl;
};

const getSampleFileDownloadUrl = async (experimentId, sampleId, fileType) => {
  const allFiles = await new SampleFile().allFilesForSample(sampleId);

  const matchingFile = allFiles.find(({ sampleFileType }) => sampleFileType === fileType);

  if (_.isNil(matchingFile)) {
    throw new NotFoundError(`File ${fileType} from sample ${sampleId} from experiment ${experimentId} not found`);
  }

  const { s3Path } = matchingFile;

  const params = {
    Bucket: bucketNames.SAMPLE_FILES,
    Key: s3Path,
  };

  const signedUrl = getSignedUrl('getObject', params);

  return signedUrl;
};

module.exports = { getSampleFileUploadUrl, getSampleFileDownloadUrl, getSignedUrl };
