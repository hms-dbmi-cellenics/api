const config = require('.');

const bucketNames = {
  SAMPLE_FILES: `biomage-originals-${config.clusterEnv}-${config.awsAccountId}`,
  PROCESSED_MATRIX: `processed-matrix-${config.clusterEnv}-${config.awsAccountId}`,
  RAW_SEURAT: `biomage-source-${config.clusterEnv}-${config.awsAccountId}`,
  CELL_SETS: `cell-sets-${config.clusterEnv}-${config.awsAccountId}`,
  FILTERED_CELLS: `biomage-filtered-cells-${config.clusterEnv}-${config.awsAccountId}`,
  WORKER_RESULTS: `worker-results-${config.clusterEnv}-${config.awsAccountId}`,
  PLOTS: `plots-tables-${config.clusterEnv}-${config.awsAccountId}`,
};

module.exports = bucketNames;
