
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
  const bucket = `biomage-filtered-cells-${config.clusterEnv}`;
  return await fileExists(bucket, experimentId);
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

  // if the earlist step to run is the first one, just return it without
  // further checks
  if (earliestStep === stepNames[0]) {
    return earliestStep;
  }
  // if the first step to run is not the first in the pipeline (stepNames[0])
  // then check if the experiment supports starting the pipeline from any step
  // we check this after computing which would be the first step because if we
  // are going to run the pipeline from the first step then we avoid having to
  // make a more costly call to S3 to check if the file exists
  const hasCellIds = await hasFilteredCellIdsAvailable(experimentId);
  if (hasCellIds) {
    return earliestStep;
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
