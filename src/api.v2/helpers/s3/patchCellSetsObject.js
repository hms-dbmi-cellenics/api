const jsonMerger = require('json-merger');

const bucketNames = require('../../../config/bucketNames');
const getObject = require('./getObject');
const putObject = require('./putObject');

const validateRequest = require('../../../utils/schema-validator');

function removeElementsWithTypeCLM(data) {
  // Filter out cell-level metadata cell sets
  return data.filter((item) => item.type !== 'CLM' && item.type !== 'CLMPerSample');
}

const containsTypeCLM = (data) => data.some((item) => {
  const appendObject = item.$append;
  return appendObject && (appendObject.type === 'CLM' || appendObject.type === 'CLMPerSample');
});

const patchCellSetsObject = async (experimentId, patch) => {
  const currentCellSet = await getObject({
    Bucket: bucketNames.CELL_SETS,
    Key: experimentId,
  });

  let { cellSets: prePatchCellSets } = JSON.parse(currentCellSet);

  // If the patch contains a cell-level metadata we need to clear them before to avoid duplications
  if (containsTypeCLM(patch)) {
    prePatchCellSets = removeElementsWithTypeCLM(prePatchCellSets);
  }

  /**
   * The $remove operation will replace the element in the array with an
   * undefined value. We will therefore remove this from the array.
   *
   * We use the $remove operation in the worker to update cell clusters,
   * and we may end up using it in other places in the future.
   */
  const patchedCellSetslist = jsonMerger.mergeObjects(
    [prePatchCellSets, patch],
  );

  const patchedCellSets = { cellSets: patchedCellSetslist };
  await validateRequest(patchedCellSets, 'cell-sets-bodies/CellSets.v2.yaml');

  await putObject({
    Bucket: bucketNames.CELL_SETS,
    Key: experimentId,
    Body: JSON.stringify(patchedCellSets),
  });
};

module.exports = patchCellSetsObject;
