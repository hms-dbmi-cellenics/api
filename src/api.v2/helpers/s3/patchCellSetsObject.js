const jsonMerger = require('json-merger');

const bucketNames = require('./bucketNames');
const getObject = require('./getObject');
const putObject = require('./putObject');

const patchCellSetsObject = async (experimentId, patch) => {
  const initialCellSet = await getObject({
    Bucket: bucketNames.CELL_SETS,
    Key: experimentId,
  });

  const { cellSets: cellSetsList } = initialCellSet;

  /**
   * The $remove operation will replace the element in the array with an
   * undefined value. We will therefore remove this from the array.
   *
   * We use the $remove operation in the worker to update cell clusters,
   * and we may end up using it in other places in the future.
   */
  const patchedArray = jsonMerger.mergeObjects(
    [cellSetsList, patch],
  ).filter((x) => x !== undefined);

  const patchedCellSet = JSON.stringify({ cellSets: patchedArray });

  await putObject({
    Bucket: bucketNames.CELL_SETS,
    Key: experimentId,
    Body: patchedCellSet,
  });
};

module.exports = patchCellSetsObject;
