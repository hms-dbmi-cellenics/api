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

const FILE_CHUNK_SIZE = 10000000;

const getMultipartSignedUrls = async (params, size) => {
  if (!params.Bucket) throw new Error('Bucket is required');
  if (!params.Key) throw new Error('Key is required');

  const S3Config = {
    apiVersion: '2006-03-01',
    signatureVersion: 'v4',
    region: config.awsRegion,
  };

  const s3 = new AWS.S3(S3Config);

  const { UploadId } = await s3.createMultipartUpload(params).promise();

  const baseParams = {
    ...params,
    UploadId,
  };

  const promises = [];
  const parts = Math.ceil(size / FILE_CHUNK_SIZE);

  for (let i = 0; i < parts; i += 1) {
    promises.push(
      s3.getSignedUrlPromise('uploadPart', {
        ...baseParams,
        PartNumber: i + 1,
      }),
    );
  }

  const signedUrls = await Promise.all(promises);

  return {
    signedUrls,
    UploadId,
  };
};


const completeMultiPartUpload = async (sampleFileId, parts, uploadId) => {
  const params = {
    Bucket: bucketNames.SAMPLE_FILES,
    Key: `${sampleFileId}`,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  };

  console.log('completeMultiPartUpload params!!!!');
  console.log(params);

  const S3Config = {
    apiVersion: '2006-03-01',
    signatureVersion: 'v4',
    region: config.awsRegion,
  };

  const s3 = new AWS.S3(S3Config);
  const res = await s3.completeMultipartUpload(params).promise();

  console.log('completeMultiPartUpload result!!');
  console.log(res);
};

const getSampleFileUploadUrls = async (sampleFileId, metadata, size) => {
  const params = {
    Bucket: bucketNames.SAMPLE_FILES,
    Key: sampleFileId,
    // 1 hour timeout of upload link
    Expires: 3600,
  };

  if (metadata.cellrangerVersion) {
    params.Metadata = {
      cellranger_version: metadata.cellrangerVersion,
    };
  }

  const signedUrls = await getMultipartSignedUrls(params, size);
  return signedUrls;
};

const fileNameToReturn = {
  matrix10x: 'matrix.mtx.gz',
  barcodes10x: 'barcodes.tsv.gz',
  features10x: 'features.tsv.gz',
};

const getSampleFileDownloadUrl = async (experimentId, sampleId, fileType) => {
  const allFiles = await new SampleFile().allFilesForSample(sampleId);

  const matchingFile = allFiles.find(({ sampleFileType }) => sampleFileType === fileType);

  if (_.isNil(matchingFile)) {
    throw new NotFoundError(`File ${fileType} from sample ${sampleId} from experiment ${experimentId} not found`);
  }

  const params = {
    Bucket: bucketNames.SAMPLE_FILES,
    Key: matchingFile.s3Path,
    ResponseContentDisposition: `attachment; filename="${fileNameToReturn[fileType]}"`,
  };

  const signedUrl = getSignedUrl('getObject', params);

  return signedUrl;
};

module.exports = {
  getSampleFileUploadUrls,
  getSampleFileDownloadUrl,
  getSignedUrl,
  getMultipartSignedUrls,
  completeMultiPartUpload,
};
