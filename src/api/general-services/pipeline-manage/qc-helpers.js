
const { fileExists } = require('../../../utils/aws/s3');
const config = require('../../../config');

const filterToStepName = {
  classifier: 'ClassifierFilterMap',
  cellSizeDistribution: 'CellSizeDistributionFilterMap',
  mitochondrialContent: 'MitochondrialContentFilterMap',
  numGenesVsNumUmis: 'NumGenesVsNumUmisFilterMap',
  doubletScores: 'DoubletScoresFilterMap',
  dataIntegration: 'DataIntegration',
  configureEmbedding: 'ConfigureEmbedding',
};

const stepNames = [
  'ClassifierFilterMap',
  'CellSizeDistributionFilterMap',
  'MitochondrialContentFilterMap',
  'NumGenesVsNumUmisFilterMap',
  'DoubletScoresFilterMap',
  'DataIntegration',
  'ConfigureEmbedding',
];


// checks whether an experiment has available filtered cell IDs in S3
// meaning it can be started from any step in the QC pipeline without
// needing to re-run previous steps
const hasFilteredCellIdsAvailable = async (experimentId) => {
  // first check if the biomage-filtered-cells-development exists
  const bucket = `biomage-filtered-cells-${config.clusterEnv}`;
  const exists = await fileExists(bucket, experimentId);
  return exists;
};

// getFirstQCStep returns which is the first step of the QC to be run
// processingConfigUpdates is not ordered
const getFirstQCStep = async (experimentId, processingConfigUpdates) => {
  let earliestStep = stepNames[0]; // normally first step
  let earliestIdx = 9999;
  processingConfigUpdates.forEach(({ name }) => {
    const stepName = filterToStepName[name];
    const idx = stepNames.indexOf(stepName);
    if (idx < earliestIdx) {
      earliestIdx = idx;
      earliestStep = stepName;
    }
  });

  // if the first step to run is not the first in the pipeline (stepNames[0])
  // then check if the experiment supports starting the pipeline from any step
  // we check this after computing which would be the first step because if we
  // are going to run the pipeline from the first step then we avoid having to
  // make a more costly call to S3 to check if the file exists
  if (earliestStep !== stepNames[0]) {
    const hasCellIds = await hasFilteredCellIdsAvailable(experimentId);

    if (hasCellIds) {
      return earliestStep;
    }
  }

  return stepNames[0];
};

const getQcStepsToRun = async (experimentId, processingConfigUpdates) => {
  const firstStep = await getFirstQCStep(experimentId, processingConfigUpdates);
  return stepNames.slice(stepNames.indexOf(firstStep));
};


module.exports = {
  getQcStepsToRun,
};
