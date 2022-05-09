const config = require('../../../config');

const bucketNames = {
  SAMPLE_FILES: `biomage-originals-${config.clusterEnv}`,
  PROCESSED_MATRIX: `processed-matrix-${config.clusterEnv}`,
  RAW_SEURAT: `biomage-source-${config.clusterEnv}`,
};

module.exports = bucketNames;
