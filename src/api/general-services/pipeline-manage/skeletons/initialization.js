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
  AssignPipelineToPod: {
    XStepType: 'assign-pod-to-pipeline',
    Next: nextStep,
    ResultPath: 'null',
  },
});


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

  return 'AssignPipelineToPod';
};

module.exports = { firstStep, buildInitialSteps };
