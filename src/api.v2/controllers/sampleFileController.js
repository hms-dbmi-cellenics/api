const sqlClient = require('../../sql/sqlClient');

const Sample = require('../model/Sample');
const SampleFile = require('../model/SampleFile');

const { getSampleFileUploadUrl } = require('../helpers/s3/signedUrl');
const { OK } = require('../../utils/responses');
const getLogger = require('../../utils/getLogger');

const logger = getLogger('[SampleFileController] - ');

const createFile = async (req, res) => {
  const {
    params: { experimentId, sampleId, sampleFileType },
    body: { sampleFileId, size, metadata = {} },
  } = req;
  logger.log(`Creating file ${sampleFileType} for sample ${sampleId} in experiment ${experimentId}`);

  const newSampleFile = {
    id: sampleFileId,
    sample_file_type: sampleFileType,
    size,
    s3_path: sampleFileId,
    upload_status: 'uploading',
  };

  let signedUrl;

  await sqlClient.get().transaction(async (trx) => {
    await new SampleFile(trx).create(newSampleFile);
    await new Sample(trx).setNewFile(sampleId, sampleFileId, sampleFileType);

    signedUrl = getSampleFileUploadUrl(sampleFileId, metadata);
  });

  logger.log(`Finished creating sample file for experiment ${experimentId}, sample ${sampleId}, sampleFileType ${sampleFileType}`);
  res.json(signedUrl);
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

module.exports = {
  createFile, patchFile,
};
