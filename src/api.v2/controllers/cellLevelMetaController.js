const { v4: uuidv4 } = require('uuid');
const _ = require('lodash');
const bucketNames = require('../../config/bucketNames');
const sqlClient = require('../../sql/sqlClient');
const CellLevelMeta = require('../model/CellLevelMeta');
const CellLevelMetaToExperiment = require('../model/CellLevelMetaToExperiment');
const { getFileUploadUrls } = require('../helpers/s3/signedUrl');
const OK = require('../../utils/responses/OK');
const getLogger = require('../../utils/getLogger');

const logger = getLogger('[CellLevelController] - ');

const uploadCellLevelMetadata = async (req, res) => {
  const { experimentId } = req.params;
  const { name, size } = req.body;

  const cellLevelMetaKey = uuidv4();
  const bucketName = bucketNames.CELL_METADATA;
  const newCellLevelMetaFile = {
    id: cellLevelMetaKey,
    name,
    upload_status: 'uploading',
    size,
  };

  let uploadUrlParams;
  await sqlClient.get().transaction(async (trx) => {
    await new CellLevelMeta(trx).create(newCellLevelMetaFile);
    await new CellLevelMetaToExperiment(trx).setNewFile(experimentId, cellLevelMetaKey);

    uploadUrlParams = await getFileUploadUrls(cellLevelMetaKey, {}, size, bucketName);
    uploadUrlParams = { ...uploadUrlParams, fileId: cellLevelMetaKey };
  });

  res.json({ data: uploadUrlParams });
};


const updateCellLevelMetadata = async (req, res) => {
  const { params: { experimentId }, body } = req;
  const snakeCasedKeysToPatch = _.mapKeys(body, (_value, key) => _.snakeCase(key));
  const { cellMetadataFileId } = await new CellLevelMetaToExperiment().find(
    { experiment_id: experimentId },
  ).first();
  await new CellLevelMeta().updateById(cellMetadataFileId, snakeCasedKeysToPatch);
  res.json(OK());
};

const downloadCellLevelFile = async (req, res) => {
  const { fileId, fileName } = req.params;
  logger.log('Getting signed url to download cell level meta file');
  const link = await new CellLevelMeta().getDownloadLink(fileId, fileName);

  res.json(link);
  logger.log('Got download link successfully');
};

module.exports = {
  uploadCellLevelMetadata,
  updateCellLevelMetadata,
  downloadCellLevelFile,
};
