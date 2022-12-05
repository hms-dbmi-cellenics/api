const { buildQCPipelineSteps, qcPipelineSteps } = require('./qcPipelineSkeleton');
const { gem2SPipelineSteps } = require('./gem2sPipelineSkeleton');
const subsetPipelineSteps = require('./subsetPipelineSteps');


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

  return gem2sStepNames.concat(qcStepNames);
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
  },
});

const getQcPipelineSkeleton = (clusterEnv, qcSteps, runInBatch = false) => {
  console.log('initialStepsDebug');
  console.log(JSON.stringify(buildInitialSteps(clusterEnv, qcSteps[0], runInBatch)));

  console.log('buildQCPipelineStepsqcStepsDebug');
  console.log(JSON.stringify(buildQCPipelineSteps(qcSteps)));

  return ({
    Comment: `QC Pipeline for clusterEnv '${clusterEnv}'`,
    StartAt: getStateMachineFirstStep(clusterEnv, runInBatch),
    States: {
      ...buildInitialSteps(clusterEnv, qcSteps[0], runInBatch),
      ...buildQCPipelineSteps(qcSteps),
    },
  });
};

const getSubsetPipelineSkeleton = (clusterEnv, qcSteps, runInBatch = false) => ({
  Comment: `Subset Pipeline for clusterEnv '${clusterEnv}'`,
  StartAt: getStateMachineFirstStep(clusterEnv, runInBatch),
  States: {
    ...buildInitialSteps(clusterEnv, qcSteps[0], runInBatch),
    ...subsetPipelineSteps,
  },
});


module.exports = {
  getPipelineStepNames,
  getQcPipelineStepNames,
  getGem2sPipelineSkeleton,
  getQcPipelineSkeleton,
  getSubsetPipelineSkeleton,
};
