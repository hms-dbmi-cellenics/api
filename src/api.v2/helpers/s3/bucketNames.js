const config = require('../../../config');

const bucketNames = {
  SAMPLE_FILES: `biomage-originals-${config.clusterEnv}-${config.accountId}`,
  PROCESSED_MATRIX: `processed-matrix-${config.clusterEnv}-${config.accountId}`,
  RAW_SEURAT: `biomage-source-${config.clusterEnv}-${config.accountId}`,
  CELL_SETS: `cell-sets-${config.clusterEnv}-${config.accountId}`,
  FILTERED_CELLS: `biomage-filtered-cells-${config.clusterEnv}-${config.accountId}`,
  WORKER_RESULTS: `worker-results-${config.clusterEnv}-${config.accountId}`,
  PLOTS: `plots-tables-${config.clusterEnv}-${config.accountId}`,
};

module.exports = bucketNames;
