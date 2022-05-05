const getLogger = require('../../utils/getLogger');

const getS3Object = require('../helpers/s3/getObject');
const bucketNames = require('../helpers/s3/bucketNames');
const formatExperimentId = require('../../utils/v1Compatibility/formatExperimentId');

const { OK } = require('../../utils/responses');

const patchCellSetsObject = require('../helpers/s3/patchCellSetsObject');

const logger = getLogger('[CellSetsController] - ');

const getCellSets = async (req, res) => {
  let { experimentId } = req.params;

  experimentId = experimentId.replace(/-/g, '');

  logger.log(`Getting cell sets for experiment ${experimentId}`);

  const cellSets = await getS3Object({
    Bucket: bucketNames.CELL_SETS,
    Key: formatExperimentId(experimentId),
  });

  logger.log(`Finished getting cell sets for experiment ${experimentId}`);

  res.json(cellSets);
};

const patchCellSets = async (req, res) => {
  const { experimentId } = req.params;
  const patch = req.body;

  logger.log(`Patching cell sets for ${experimentId}`);
  await patchCellSetsObject(formatExperimentId(experimentId), patch);

  logger.log(`Finished patching cell sets for experiment ${experimentId}`);

  res.json(OK());
};

module.exports = {
  getCellSets,
  patchCellSets,
};
