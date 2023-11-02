const _ = require('lodash');
const { fileExists } = require('../../s3/fileExists');
const { FILTERED_CELLS } = require('../../../../config/bucketNames');
const { filterToStepName, qcStepNames, backendStepNamesToStepName } = require('./constructors/qcStepNameTranslations');
const CellLevelMeta = require('../../../model/CellLevelMeta');
const { QC_PROCESS_NAME } = require('../../../constants');
const ExperimentExecution = require('../../../model/ExperimentExecution');

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

const getCellLevelMetadataFileChanged = async (experimentId) => {
  const [cellLevelMetadata] = await new CellLevelMeta()
    .getMetadataByExperimentIds([experimentId]);
  const { id: currentCellMetadataId = null } = cellLevelMetadata || {};

  const execution = await new ExperimentExecution()
    .find({ experiment_id: experimentId, pipeline_type: QC_PROCESS_NAME })
    .first();

  const lastRunCellMetadataId = execution.lastPipelineParams
    ? execution.lastPipelineParams.cellMetadataId : null;

  return lastRunCellMetadataId !== currentCellMetadataId;
};

// getFirstQCStep returns which is the first step of the QC to be run
// processingConfigUpdatedKeys is not ordered
const getFirstQCStep = async (experimentId, processingConfigUpdatedKeys, backendCompletedSteps) => {
  if (
    processingConfigUpdatedKeys.length === 0
    && await getCellLevelMetadataFileChanged(experimentId)
  ) {
    return filterToStepName.configureEmbedding;
  }

  if (processingConfigUpdatedKeys.length === 0) {
    throw new Error(
      `At experiment ${experimentId}: qc can be triggered with 
        processingConfigUpdates = empty array only if the cell level metadata changed`,
    );
  }

  let firstChangedStep;
  let earliestIdx = 9999;
  processingConfigUpdatedKeys.forEach((key) => {
    const stepName = filterToStepName[key];
    const idx = qcStepNames.indexOf(stepName);
    if (idx < earliestIdx) {
      earliestIdx = idx;
      firstChangedStep = stepName;
    }
  });

  const completedSteps = backendCompletedSteps.map(
    (currentStep) => backendStepNamesToStepName[currentStep],
  );

  const notCompletedSteps = _.difference(qcStepNames, completedSteps);

  // notCompletedSteps: the steps that have not been run for the currently persisted qc config
  // firstChangedStep: the first step that introduces a new change to the persisted qc config
  // We need to rerun all the changed steps and all the notCompletedSteps,
  // so start from whichever is earlier: firstChangedStep or first notCompletedStep
  // We do this by checking notCompletedSteps:
  // - if it includes firstChangedStep then we can start from notCompletedStep[0]
  // - if it doesn't, then firstChangedStep is earlier, so start from it
  const firstStep = (!firstChangedStep || notCompletedSteps.includes(firstChangedStep))
    ? notCompletedSteps[0] : firstChangedStep;

  // if firstStep is the first out of all of qc, just return it without
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

const getQcStepsToRun = async (experimentId, processingConfigUpdatedKeys, completedSteps) => {
  const firstStep = await getFirstQCStep(
    experimentId, processingConfigUpdatedKeys, completedSteps,
  );

  return qcStepNames.slice(qcStepNames.indexOf(firstStep));
};

module.exports = {
  getQcStepsToRun,
  qcStepsWithFilterSettings,
};
