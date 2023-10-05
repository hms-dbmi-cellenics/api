const sqlClient = require('../../sql/sqlClient');

const Sample = require('../model/Sample');
const SampleFile = require('../model/SampleFile');
const bucketNames = require('../../config/bucketNames');

const { getFileUploadUrls, getSampleFileDownloadUrl } = require('../helpers/s3/signedUrl');
const { OK } = require('../../utils/responses');
const getLogger = require('../../utils/getLogger');

const logger = getLogger('[SampleFileController] - ');

const createFile = async (req, res) => {
  const {
    params: { experimentId, sampleId, sampleFileType },
    body: { sampleFileId, size },
  } = req;
  logger.log(`Creating file ${sampleFileType} for sample ${sampleId} in experiment ${experimentId}`);

  const newSampleFile = {
    id: sampleFileId,
    sample_file_type: sampleFileType,
    size,
    s3_path: sampleFileId,
    upload_status: 'uploading',
  };



  await sqlClient.get().transaction(async (trx) => {
    await new SampleFile(trx).create(newSampleFile);
    await new Sample(trx).setNewFile(sampleId, sampleFileId, sampleFileType);
  });


  logger.log(`Finished creating sample file for experiment ${experimentId}, sample ${sampleId}, sampleFileType ${sampleFileType}`);

  res.json(OK());
};

const beginUpload = async (req, res) => {
  const {
    params: { experimentId, sampleFileId },
    body: { metadata, size },
  } = req;

  logger.log(`Generating multipart upload urls for ${experimentId}, sample file ${sampleFileId}`);
  const uploadParams = await getFileUploadUrls(
    sampleFileId, metadata, size, bucketNames.SAMPLE_FILES,
  );

  res.json(uploadParams);
};

const patchFile = async (req, res) => {
  const {
    params: { experimentId, sampleId, sampleFileType },
    body: { uploadStatus },
  } = req;
  logger.log(`Patching file ${sampleFileType} for sample ${sampleId} in experiment ${experimentId}`);

  await new SampleFile().updateUploadStatus(sampleId, sampleFileType, uploadStatus);

  logger.log(`Finished patching sample file for experiment ${experimentId}, sample ${sampleId}, sampleFileType ${sampleFileType}`);
  res.json(OK());
};

const getS3DownloadUrl = async (req, res) => {
  const { experimentId, sampleId, sampleFileType } = req.params;

  logger.log(`Creating downloadUrl for ${sampleFileType} for sample ${sampleId} in experiment ${experimentId}`);

  const signedUrl = await getSampleFileDownloadUrl(experimentId, sampleId, sampleFileType);

  logger.log(`Finished creating downloadUrl for ${sampleFileType} for sample ${sampleId} in experiment ${experimentId}`);

  res.json(signedUrl);
};

module.exports = {
  createFile, beginUpload, patchFile, getS3DownloadUrl,
};
