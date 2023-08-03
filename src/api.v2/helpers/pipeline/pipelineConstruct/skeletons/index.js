const { buildQCPipelineSteps, qcPipelineSteps } = require('./qcPipelineSkeleton');
const { gem2SPipelineSteps } = require('./gem2sPipelineSkeleton');
const { seuratPipelineSteps } = require('./seuratPipelineSkeleton');
const subsetPipelineSteps = require('./subsetPipelineSteps');
const { createCatchSteps } = require('../constructors/createHandleErrorStep');
const {
  END_OF_PIPELINE,
  HANDLE_ERROR_STEP,
} = require('../../../../constants');
const copyPipelineSteps = require('./copyPipelineSteps');

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
    XCatch: createCatchSteps(),
  },
});

const submitBatchJob = (nextStep) => ({
  SubmitBatchJob: {
    XStepType: 'submit-batch-job',
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
  const seuratStepNames = getSkeletonStepNames(seuratPipelineSteps);

  return gem2sStepNames.concat(qcStepNames).concat(seuratStepNames);
};

// getPipelineStepNames returns the names of the QC pipeline steps
// if there are map states with nested substeps it returns those sub-steps too
const getQcPipelineStepNames = () => getSkeletonStepNames(qcPipelineSteps);

const buildInitialSteps = (clusterEnv, nextStep, runInBatch) => {
  // if we are running locally launch a pipeline job
  if (clusterEnv === 'development') {
    return createLocalPipeline(nextStep);
  }

  if (runInBatch) {
    return submitBatchJob(nextStep);
  }

  // if we are in aws assign a pod to the pipeline
  return assignPipelineToPod(nextStep);
};

const buildErrorHandlingSteps = () => ({
  [HANDLE_ERROR_STEP]: {
    XStepType: 'create-handle-error-step',
    Next: 'MarkAsFailed',
  },
  MarkAsFailed: {
    Type: 'Fail',
  },
});

const buildEndOfPipelineStep = () => ({
  [END_OF_PIPELINE]: {
    Type: 'Pass',
    End: true,
  },
});

const getStateMachineFirstStep = (clusterEnv, runInBatch) => {
  if (clusterEnv === 'development') {
    return 'DeleteCompletedPipelineWorker';
  }

  if (runInBatch) {
    return 'SubmitBatchJob';
  }

  return 'RequestPod';
};


const getGem2sPipelineSkeleton = (clusterEnv, runInBatch = false) => ({
  Comment: `Gem2s Pipeline for clusterEnv '${clusterEnv}'`,
  StartAt: getStateMachineFirstStep(clusterEnv, runInBatch),
  States: {
    ...buildInitialSteps(clusterEnv, 'DownloadGem', runInBatch),
    ...gem2SPipelineSteps,
    ...buildErrorHandlingSteps(),
    ...buildEndOfPipelineStep(),
  },
});

const getSeuratPipelineSkeleton = (clusterEnv, runInBatch = false) => ({
  Comment: `Seurat Pipeline for clusterEnv '${clusterEnv}'`,
  StartAt: getStateMachineFirstStep(clusterEnv, runInBatch),
  States: {
    ...buildInitialSteps(clusterEnv, 'DownloadSeurat', runInBatch),
    ...seuratPipelineSteps,
    ...buildErrorHandlingSteps(),
    ...buildEndOfPipelineStep(),
  },
});

const getQcPipelineSkeleton = (clusterEnv, qcSteps, runInBatch = false) => ({
  Comment: `QC Pipeline for clusterEnv '${clusterEnv}'`,
  StartAt: getStateMachineFirstStep(clusterEnv, runInBatch),
  States: {
    ...buildInitialSteps(clusterEnv, qcSteps[0], runInBatch),
    ...buildQCPipelineSteps(qcSteps),
    ...buildErrorHandlingSteps(),
    ...buildEndOfPipelineStep(),
  },
});

const getSubsetPipelineSkeleton = (clusterEnv, runInBatch = false) => ({
  Comment: `Subset Pipeline for clusterEnv '${clusterEnv}'`,
  StartAt: getStateMachineFirstStep(clusterEnv, runInBatch),
  States: {
    ...buildInitialSteps(clusterEnv, 'SubsetSeurat', runInBatch),
    ...subsetPipelineSteps,
    ...buildErrorHandlingSteps(),
    ...buildEndOfPipelineStep(),
  },
});

const getCopyPipelineSkeleton = (clusterEnv, runInBatch = false) => ({
  Comment: `Copy Pipeline for clusterEnv '${clusterEnv}'`,
  StartAt: getStateMachineFirstStep(clusterEnv, runInBatch),
  States: {
    ...buildInitialSteps(clusterEnv, 'CopyS3Objects', runInBatch),
    ...copyPipelineSteps,
    ...buildErrorHandlingSteps(),
    ...buildEndOfPipelineStep(),
  },
});


module.exports = {
  getPipelineStepNames,
  getQcPipelineStepNames,
  getGem2sPipelineSkeleton,
  getQcPipelineSkeleton,
  getSeuratPipelineSkeleton,
  getSubsetPipelineSkeleton,
  getCopyPipelineSkeleton,
};
