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

// json-merger operations that introduce new cell set content into the object.
const ADD_OPERATIONS = ['$append', '$prepend', '$insert'];

// Whether a patch can introduce new (potentially invalid) cell sets. Deletes
// ($remove) and property updates (rename / recolor via `value`) only ever
// touch existing, already-valid nodes, so they cannot make the object invalid.
// Only add operations can, so we only need to re-validate for those.
const patchAddsCellSets = (node) => {
  if (Array.isArray(node)) {
    return node.some(patchAddsCellSets);
  }
  if (node !== null && typeof node === 'object') {
    return Object.keys(node).some(
      (key) => ADD_OPERATIONS.includes(key) || patchAddsCellSets(node[key]),
    );
  }
  return false;
};

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

  // Validating the whole cell sets object re-checks every cellId and scales
  // with the number of cells (the dominant cost of a patch). Deletes and
  // rename/recolor patches cannot invalidate an already-valid object, so only
  // re-validate when the patch adds new cell sets (e.g. scType / CASSIA).
  if (patchAddsCellSets(patch)) {
    await validateRequest(patchedCellSets, 'cell-sets-bodies/CellSets.v2.yaml');
  }

  await putObject({
    Bucket: bucketNames.CELL_SETS,
    Key: experimentId,
    Body: JSON.stringify(patchedCellSets),
  });
};

module.exports = patchCellSetsObject;
