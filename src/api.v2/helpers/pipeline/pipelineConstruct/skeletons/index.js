const { buildQCPipelineSteps, qcPipelineSteps } = require('./qcPipelineSkeleton');
const { gem2SPipelineSteps } = require('./gem2sPipelineSkeleton');


const needsBatchJob = (cpus, mem) => {
  const DEFAULT_CPUS = 4;
  const DEFAULT_MEM = 29;
  return cpus !== DEFAULT_CPUS || mem !== DEFAULT_MEM;
};

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

const buildInitialSteps = (clusterEnv, nextStep, podCPUs, podMem) => {
  // if we are running locally launch a pipeline job
  if (clusterEnv === 'development') {
    return createLocalPipeline(nextStep);
  }

  if (needsBatchJob(podCPUs, podMem)) {
    return submitBatchJob(nextStep);
  }

  // if we are in aws assign a pod to the pipeline
  return assignPipelineToPod(nextStep);
};

const getStateMachineFirstStep = (clusterEnv, podCPUs, podMem) => {
  if (clusterEnv === 'development') {
    return 'DeleteCompletedPipelineWorker';
  }

  if (needsBatchJob(podCPUs, podMem)) {
    return 'SubmitBatchJob';
  }

  return 'RequestPod';
};


const getGem2sPipelineSkeleton = (clusterEnv, podCPUs, podMem) => ({
  Comment: `Gem2s Pipeline for clusterEnv '${clusterEnv}'`,
  StartAt: getStateMachineFirstStep(clusterEnv, podCPUs, podMem),
  States: {
    ...buildInitialSteps(clusterEnv, 'DownloadGem', podCPUs, podMem),
    ...gem2SPipelineSteps,
  },
});

const getQcPipelineSkeleton = (clusterEnv, qcSteps, podCPUs, podMem) => ({
  Comment: `QC Pipeline for clusterEnv '${clusterEnv}'`,
  StartAt: getStateMachineFirstStep(clusterEnv, podCPUs, podMem),
  States: {
    ...buildInitialSteps(clusterEnv, qcSteps[0], podCPUs, podMem),
    ...buildQCPipelineSteps(qcSteps),
  },
});


module.exports = {
  getPipelineStepNames,
  getQcPipelineStepNames,
  getGem2sPipelineSkeleton,
  getQcPipelineSkeleton,
};
