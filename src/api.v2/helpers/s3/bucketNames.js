const config = require('../../../config');

const bucketNames = {
  SAMPLE_FILES: `biomage-originals-test-${config.clusterEnv}-${config.awsAccountId}`,
  PROCESSED_MATRIX: `processed-matrix-test-${config.clusterEnv}-${config.awsAccountId}`,
  RAW_SEURAT: `biomage-source-test-${config.clusterEnv}-${config.awsAccountId}`,
  CELL_SETS: `cell-sets-test-${config.clusterEnv}-${config.awsAccountId}`,
  FILTERED_CELLS: `biomage-filtered-cells-test-${config.clusterEnv}-${config.awsAccountId}`,
  WORKER_RESULTS: `worker-results-test-${config.clusterEnv}-${config.awsAccountId}`,
  PLOTS: `plots-tables-test-${config.clusterEnv}-${config.awsAccountId}`,
};

module.exports = bucketNames;
