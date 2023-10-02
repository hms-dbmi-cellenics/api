const { v4: uuidv4 } = require('uuid');
const _ = require('lodash');
const bucketNames = require('../../config/bucketNames');
const sqlClient = require('../../sql/sqlClient');
const CellLevel = require('../model/CellLevel');
const CellLevelToExperiment = require('../model/CellLevelToExperiment');
const { getFileUploadUrls } = require('../helpers/s3/signedUrl');
const OK = require('../../utils/responses/OK');

const uploadCellLevelMetadata = async (req, res) => {
  const { experimentId } = req.params;
  const { name, size } = req.body;

  const cellLevelKey = uuidv4();
  const bucketName = bucketNames.CELL_METADATA;
  const newCellLevelFile = {
    id: cellLevelKey,
    name,
    upload_status: 'uploading',
  };
  const cellLevelToExperimentMap = {
    experiment_id: experimentId,
    cell_metadata_file_id: cellLevelKey,
  };

  let uploadUrlParams;
  await sqlClient.get().transaction(async (trx) => {
    await new CellLevel(trx).create(newCellLevelFile);
    await new CellLevelToExperiment(trx).create(cellLevelToExperimentMap);
    uploadUrlParams = await getFileUploadUrls(cellLevelKey, {}, size, bucketName);
    uploadUrlParams = { ...uploadUrlParams, fileId: cellLevelKey };
  });

  res.json({ data: uploadUrlParams });
};


const updateCellLevelMetadata = async (req, res) => {
  const { params: { experimentId }, body } = req;
  const snakeCasedKeysToPatch = _.mapKeys(body, (_value, key) => _.snakeCase(key));
  const { cellMetadataFileId } = await new CellLevelToExperiment().find({ experiment_id: experimentId }).first();
  await new CellLevel().updateById(cellMetadataFileId, snakeCasedKeysToPatch);
  res.json(OK());
};
module.exports = {
  uploadCellLevelMetadata,
  updateCellLevelMetadata,
};
