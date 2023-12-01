const getCellSetsAffectingDownsampling = require('./getCellSetsAffectingDownsampling');
const submitWorkForHook = require('./submitWorkForHook');
const bucketNames = require('../../../../config/bucketNames');
const getObject = require('../../s3/getObject');

const submitMarkerHeatmapWork = async (message) => {
  const { experimentId, input: { authJWT } } = message;

  const { cellSets } = JSON.parse(await getObject({
    Bucket: bucketNames.CELL_SETS,
    Key: experimentId,
  }));

  const body = {
    name: 'MarkerHeatmap',
    nGenes: 5,
    downsampleSettings: {
      selectedCellSet: 'louvain',
      groupedTracks: ['louvain', 'sample'],
      selectedPoints: 'All',
      hiddenCellSets: [],
    },
  };

  const cs = await getCellSetsAffectingDownsampling(experimentId, body, cellSets);

  body.downsampleSettings.cellSets = cs;

  const ETag = await submitWorkForHook(experimentId, authJWT, body);

  // explicitly return ETag to make it stand out more in tests and so harder to break
  return ETag;
};

module.exports = submitMarkerHeatmapWork;
