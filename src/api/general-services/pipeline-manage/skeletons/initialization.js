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

module.exports = { firstStep, buildInitialSteps };
