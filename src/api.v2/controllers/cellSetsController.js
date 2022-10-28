const getLogger = require('../../utils/getLogger');

const getS3Object = require('../helpers/s3/getObject');
const bucketNames = require('../../config/bucketNames');

const { OK } = require('../../utils/responses');

const patchCellSetsObject = require('../helpers/s3/patchCellSetsObject');

const logger = getLogger('[CellSetsController] - ');

const getCellSets = async (req, res) => {
  const { experimentId } = req.params;

  logger.log(`Getting cell sets for experiment ${experimentId}`);

  const cellSets = await getS3Object({
    Bucket: bucketNames.CELL_SETS,
    Key: experimentId,
  });

  logger.log(`Finished getting cell sets for experiment ${experimentId}`);

  res.send(cellSets);
};

const patchCellSets = async (req, res) => {
  const { experimentId } = req.params;
  const patch = req.body;

  logger.log(`Patching cell sets for ${experimentId}`);
  await patchCellSetsObject(experimentId, patch);

  logger.log(`Finished patching cell sets for experiment ${experimentId}`);

  res.json(OK());
};

module.exports = {
  getCellSets,
  patchCellSets,
};
