const bucketNames = require('../../../../config/bucketNames');
const getS3Object = require('../../s3/getObject');
const getExtraDependencies = require('./getExtraDependencies');
const submitWork = require('./submitWork');

const submitMarkerHeatmapWork = async (message) => {
  const { experimentId, input: { authJWT } } = message;

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

  const { cellSets } = JSON.parse(await getS3Object({
    Bucket: bucketNames.CELL_SETS,
    Key: experimentId,
  }));

  const extraDependencies = await getExtraDependencies(body.name, message, body, cellSets);

  const ETag = await submitWork(experimentId, authJWT, body, extraDependencies);

  // explicitly return ETag to make it stand out more in tests and so harder to break
  return ETag;
};

module.exports = submitMarkerHeatmapWork;
