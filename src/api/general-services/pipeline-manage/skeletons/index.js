const { buildQCPipelineSteps, qcPipelineSteps } = require('./qc-pipeline-skeleton');
const { gem2SPipelineSteps } = require('./gem2s-pipeline-skeleton');
const { fileExists } = require('../../../../utils/aws/s3');
const config = require('../../../../config');


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


const createLocalPipeline = (nextStep) => ({
  DeleteCompletedPipelineWorker: {
    XStepType: 'delete-completed-jobs',
    Next: 'LaunchNewPipelineWorker',
    ResultPath: null,
  },
  LaunchNewPipelineWorker: {
    XStepType: 'create-new-job-if-not-exist',
    Next: nextStep,
    ResultPath: null,
  },
});

const assignPipelineToPod = (nextStep) => ({
  RequestPod: {
    XStepType: 'request-pod',
    ResultPath: null,
    Next: 'WaitForPod',
  },
  WaitForPod: {
    XStepType: 'wait-for-pod',
    ResultPath: null,
    Next: nextStep,
  },
});

const getSkeletonStepNames = (skeleton) => {
  const steps = Object.keys(skeleton);
  // we need to add the substep keys too
  Object.values(skeleton).forEach((step) => {
    if ('Iterator' in step) {
      steps.push(...Object.keys(step.Iterator.States));
    }
  });

  return steps;
};

// getPipelineStepNames returns the names of the pipeline steps
// if there are map states with nested substeps it returns those sub-steps too
const getPipelineStepNames = () => {
  const gem2sStepNames = getSkeletonStepNames(gem2SPipelineSteps);
  const qcStepNames = getSkeletonStepNames(qcPipelineSteps);

  return gem2sStepNames.concat(qcStepNames);
};

const buildInitialSteps = (clusterEnv, nextStep) => {
  // if we are running locally launch a pipeline job
  if (clusterEnv === 'development') {
    return createLocalPipeline(nextStep);
  }
  // if we are in aws assign a pod to the pipeline
  return assignPipelineToPod(nextStep);
};

const getStateMachineFirstStep = (clusterEnv) => {
  if (clusterEnv === 'development') {
    return 'DeleteCompletedPipelineWorker';
  }

  return 'RequestPod';
};

// checks whether an experiment has available filtered cell IDs in S3
// meaning it can be started from any step in the QC pipeline without
// needing to re-run previous steps
const hasFilteredCellIdsAvailable = (experimentId) => {
  // first check if the biomage-filtered-cells-development exists
  const bucket = `biomage-filtered-cells-${config.clusterEnv}`;
  return fileExists(bucket, experimentId);
};

// getFirstQCStep returns which is the first step of the QC to be run
// processingConfigUpdates is not ordered
const getFirstQCStep = (experimentId, processingConfigUpdates) => {
  let earliestStep = 'ClassifierFilterMap'; // normally first step
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
  if (earliestStep !== stepNames[0] && hasFilteredCellIdsAvailable(experimentId)) {
    return earliestStep;
  }
  return stepNames[0];
};

const getQCStepsToRun = (first) => {
  const firstIdx = stepNames.indexOf(first);
  return stepNames.slice(firstIdx);
};

const getGem2sPipelineSkeleton = (clusterEnv) => ({
  Comment: `Gem2s Pipeline for clusterEnv '${clusterEnv}'`,
  StartAt: getStateMachineFirstStep(clusterEnv),
  States: {
    ...buildInitialSteps(clusterEnv, 'DownloadGem'),
    ...gem2SPipelineSteps,
  },
});

const getQcPipelineSkeleton = (clusterEnv, experimentId, processingConfigUpdates) => {
  const firstStep = getFirstQCStep(experimentId, processingConfigUpdates);
  const qcSteps = getQCStepsToRun(firstStep);
  return {
    Comment: `QC Pipeline for clusterEnv '${clusterEnv}'`,
    StartAt: getStateMachineFirstStep(clusterEnv),
    States: {
      ...buildInitialSteps(clusterEnv, firstStep),
      ...buildQCPipelineSteps(qcSteps),
    },
  };
};


module.exports = {
  getFirstQCStep,
  getQCStepsToRun,
  getPipelineStepNames,
  getGem2sPipelineSkeleton,
  getQcPipelineSkeleton,
};
