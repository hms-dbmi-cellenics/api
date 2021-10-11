const { qcPipelineSteps } = require('./qc-pipeline-skeleton');
const { gem2SPipelineSteps } = require('./gem2s-pipeline-skeleton');

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
  GetExperimentRunningPods: {
    XStepType: 'get-running-pods',
    Next: 'DeletePreviousPods',
    ResultPath: '$.runningPods',
  },
  DeletePreviousPods: {
    XStepType: 'delete-running-pods',
    ResultPath: null,
    Next: 'AssignPipelineToPod',
  },
  AssignPipelineToPod: {
    XStepType: 'assign-pipeline-to-pod',
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
  // we need to add too the substep keys
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

const firstStep = (clusterEnv) => {
  if (clusterEnv === 'development') {
    return 'DeleteCompletedPipelineWorker';
  }

  return 'GetExperimentRunningPods';
};

const getGem2sPipelineSkeleton = (clusterEnv) => ({
  Comment: `Gem2s Pipeline for clusterEnv '${clusterEnv}'`,
  StartAt: firstStep(clusterEnv),
  States: {
    ...buildInitialSteps(clusterEnv, 'DownloadGem'),
    ...gem2SPipelineSteps,
  },
});

const getQcPipelineSkeleton = (clusterEnv) => ({
  Comment: `QC Pipeline for clusterEnv '${clusterEnv}'`,
  StartAt: firstStep(clusterEnv),
  States: {
    ...buildInitialSteps(clusterEnv, 'ClassifierFilterMap'),
    ...qcPipelineSteps,
  },
});


module.exports = { getPipelineStepNames, getGem2sPipelineSkeleton, getQcPipelineSkeleton };
