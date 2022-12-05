const { buildQCPipelineSteps, qcPipelineSteps } = require('./qcPipelineSkeleton');
const { gem2SPipelineSteps } = require('./gem2sPipelineSkeleton');
const { seuratPipelineSteps } = require('./seuratPipelineSkeleton');


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
  const seuratStepNames = getSkeletonStepNames(seuratPipelineSteps);

  return gem2sStepNames.concat(qcStepNames).concat(seuratStepNames);
};

// getPipelineStepNames returns the names of the QC pipeline steps
// if there are map states with nested substeps it returns those sub-steps too
const getQcPipelineStepNames = () => getSkeletonStepNames(qcPipelineSteps);

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


const getGem2sPipelineSkeleton = (clusterEnv) => ({
  Comment: `Gem2s Pipeline for clusterEnv '${clusterEnv}'`,
  StartAt: getStateMachineFirstStep(clusterEnv),
  States: {
    ...buildInitialSteps(clusterEnv, 'DownloadGem'),
    ...gem2SPipelineSteps,
  },
});

const getSeuratPipelineSkeleton = (clusterEnv) => ({
  Comment: `Seurat Pipeline for clusterEnv '${clusterEnv}'`,
  StartAt: getStateMachineFirstStep(clusterEnv),
  States: {
    ...buildInitialSteps(clusterEnv, 'DownloadSeurat'),
    ...seuratPipelineSteps,
  },
});

const getQcPipelineSkeleton = (clusterEnv, qcSteps) => ({
  Comment: `QC Pipeline for clusterEnv '${clusterEnv}'`,
  StartAt: getStateMachineFirstStep(clusterEnv),
  States: {
    ...buildInitialSteps(clusterEnv, qcSteps[0]),
    ...buildQCPipelineSteps(qcSteps),
  },
});


module.exports = {
  getPipelineStepNames,
  getQcPipelineStepNames,
  getGem2sPipelineSkeleton,
  getQcPipelineSkeleton,
  getSeuratPipelineSkeleton,
};
