const { v4: uuidv4 } = require('uuid');
const bucketNames = require('../../config/bucketNames');
const sqlClient = require('../../sql/sqlClient');
const CellLevel = require('../model/CellLevel');
const { getSignedUrl } = require('../helpers/s3/signedUrl');


const uploadCellLevelMetadata = async (req, res) => {
  const { experimentId } = req.params;
  const { name, createdAt } = req.body;

  const cellLevelKey = uuidv4();
  const bucketName = bucketNames.CELL_METADATA;
  const newCellLevelFile = {
    id: cellLevelKey,
    created_at: createdAt,
    name,
    upload_status: 'uploaded',
  };
  const cellLevelToExperimentMap = {
    experiment_id: experimentId,
    cell_metadata_file_id: cellLevelKey,
  };

  let uploadUrl;
  await sqlClient.get().transaction(async (trx) => {
    await new CellLevel(trx).create(newCellLevelFile);
    await new CellLevelToExperiment(trx).create(cellLevelToExperimentMap);

    uploadUrl = getSignedUrl('putObject',
      {
        Bucket: bucketName,
        Key: cellLevelKey,
      });
  });

  res.json(uploadUrl);
};

module.exports = {
  uploadCellLevelMetadata,
};
