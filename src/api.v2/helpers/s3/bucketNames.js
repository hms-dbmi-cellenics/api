const config = require('../../../config');

const bucketNames = {
  SAMPLE_FILES: `biomage-originals-${config.clusterEnv}`,
};

module.exports = bucketNames;
