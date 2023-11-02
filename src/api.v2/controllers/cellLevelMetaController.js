const { v4: uuidv4 } = require('uuid');
const _ = require('lodash');
const bucketNames = require('../../config/bucketNames');
const sqlClient = require('../../sql/sqlClient');
const CellLevelMeta = require('../model/CellLevelMeta');
const CellLevelMetaToExperiment = require('../model/CellLevelMetaToExperiment');
const { getFileUploadUrls } = require('../helpers/s3/signedUrl');
const OK = require('../../utils/responses/OK');

const uploadCellLevelMetadata = async (req, res) => {
  const { experimentId } = req.params;
  const { name, size } = req.body;

  const cellLevelMetaKey = uuidv4();
  const bucketName = bucketNames.CELL_METADATA;
  const newCellLevelMetaFile = {
    id: cellLevelMetaKey,
    name,
    upload_status: 'uploading',
  };
  const cellLevelMetaToExperimentMap = {
    experiment_id: experimentId,
    cell_metadata_file_id: cellLevelMetaKey,
  };

  let uploadUrlParams;
  await sqlClient.get().transaction(async (trx) => {
    await new CellLevelMeta(trx).create(newCellLevelMetaFile);
    await new CellLevelMetaToExperiment(trx).create(cellLevelMetaToExperimentMap);
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
module.exports = {
  uploadCellLevelMetadata,
  updateCellLevelMetadata,
};
