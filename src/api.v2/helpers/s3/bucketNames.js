const config = require('../../../config');

const accountId = 242905224710;
const bucketNames = {
  SAMPLE_FILES: `biomage-originals-${config.clusterEnv}-${accountId}`,
  PROCESSED_MATRIX: `processed-matrix-${config.clusterEnv}-${accountId}`,
  RAW_SEURAT: `biomage-source-${config.clusterEnv}-${accountId}`,
  CELL_SETS: `cell-sets-${config.clusterEnv}-${accountId}`,
  FILTERED_CELLS: `biomage-filtered-cells-${config.clusterEnv}-${accountId}`,
  WORKER_RESULTS: `worker-results-${config.clusterEnv}-${accountId}`,
  PLOTS: `plots-tables-${config.clusterEnv}-${accountId}`,
};

module.exports = bucketNames;
