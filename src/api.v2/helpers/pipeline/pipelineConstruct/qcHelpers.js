const _ = require('lodash');
const { fileExists } = require('../../s3/fileExists');
const { FILTERED_CELLS } = require('../../../../config/bucketNames');
const { filterToStepName, qcStepNames, backendStepNamesToStepName } = require('./constructors/qcStepNameTranslations');

const qcStepsWithFilterSettings = [
  'cellSizeDistribution',
  'mitochondrialContent',
  'classifier',
  'numGenesVsNumUmis',
  'doubletScores',
];

// checks whether an experiment has available filtered cell IDs in S3
// meaning it can be started from any step in the QC pipeline without
// needing to re-run previous steps
const hasFilteredCellIdsAvailable = async (experimentId) => (
  await fileExists(FILTERED_CELLS, experimentId)
);
// getFirstQCStep returns which is the first step of the QC to be run
// processingConfigUpdates is not ordered
const getFirstQCStep = async (experimentId, processingConfigUpdates, backendCompletedSteps) => {
  let earliestChangedStep;
  let earliestIdx = 9999;
  processingConfigUpdates.forEach(({ name }) => {
    const stepName = filterToStepName[name];
    const idx = qcStepNames.indexOf(stepName);
    if (idx < earliestIdx) {
      earliestIdx = idx;
      earliestChangedStep = stepName;
    }
  });

  const completedSteps = backendCompletedSteps.map(
    (currentStep) => backendStepNamesToStepName[currentStep],
  );

  const pendingSteps = _.difference(qcStepNames, completedSteps);

  // Choose the earliestStep by checking:
  // if pendingSteps includes it, then pendingSteps has the earliest step
  // if not, earliestChangedStep is the earliest step
  const firstStep = (!earliestChangedStep || pendingSteps.includes(earliestChangedStep))
    ? pendingSteps[0] : earliestChangedStep;

  // if the earlist step to run is the first one, just return it without
  // further checks
  if (firstStep === qcStepNames[0]) {
    return firstStep;
  }
  // if the first step to run is not the first in the pipeline (stepNames[0])
  // then check if the experiment supports starting the pipeline from any step
  // we check this after computing which would be the first step because if we
  // are going to run the pipeline from the first step then we avoid having to
  // make a more costly call to S3 to check if the file exists
  const hasCellIds = await hasFilteredCellIdsAvailable(experimentId);
  if (hasCellIds) {
    return firstStep;
  }


  return qcStepNames[0];
};

const getQcStepsToRun = async (experimentId, processingConfigUpdates, completedSteps) => {
  const firstStep = await getFirstQCStep(experimentId, processingConfigUpdates, completedSteps);
  return qcStepNames.slice(qcStepNames.indexOf(firstStep));
};

module.exports = {
  getQcStepsToRun,
  qcStepsWithFilterSettings,
};
