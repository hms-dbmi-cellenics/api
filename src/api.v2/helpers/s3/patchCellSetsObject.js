const jsonMerger = require('json-merger');

const bucketNames = require('./bucketNames');
const getObject = require('./getObject');
const putObject = require('./putObject');

const validateRequest = require('../../../utils/schema-validator');

const patchCellSetsObject = async (experimentId, patch) => {
  const currentCellSet = await getObject({
    Bucket: bucketNames.CELL_SETS,
    Key: experimentId,
  });

  const { cellSets: prePatchCellSets } = currentCellSet;

  /**
   * The $remove operation will replace the element in the array with an
   * undefined value. We will therefore remove this from the array.
   *
   * We use the $remove operation in the worker to update cell clusters,
   * and we may end up using it in other places in the future.
   */
  const patchedCellSetslist = jsonMerger.mergeObjects(
    [prePatchCellSets, patch],
  ).filter((x) => x !== undefined);

  const patchedCellSets = { cellSets: patchedCellSetslist };

  await validateRequest(patchedCellSets, 'cell-sets-bodies/CellSets.v2.yaml');

  await putObject({
    Bucket: bucketNames.CELL_SETS,
    Key: experimentId,
    Body: JSON.stringify(patchedCellSets),
  });
};

module.exports = patchCellSetsObject;
