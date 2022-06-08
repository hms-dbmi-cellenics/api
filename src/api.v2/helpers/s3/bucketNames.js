const config = require('../../../config');

const bucketNames = {
  SAMPLE_FILES: `biomage-originals-${config.clusterEnv}-242905224710`,
  PROCESSED_MATRIX: `processed-matrix-${config.clusterEnv}-242905224710`,
  RAW_SEURAT: `biomage-source-${config.clusterEnv}-242905224710`,
  CELL_SETS: `cell-sets-${config.clusterEnv}-242905224710`,
  FILTERED_CELLS: `biomage-filtered-cells-${config.clusterEnv}-242905224710`,
  WORKER_RESULTS: `worker-results-${config.clusterEnv}-242905224710`,
};

module.exports = bucketNames;
