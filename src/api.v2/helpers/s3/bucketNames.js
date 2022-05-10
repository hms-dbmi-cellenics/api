const config = require('../../../config');

const bucketNames = {
  SAMPLE_FILES: `biomage-originals-${config.clusterEnv}`,
  CELL_SETS: `cell-sets-${config.clusterEnv}`,
};

module.exports = bucketNames;
