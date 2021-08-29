const config = require('../../../../config');

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

const assignWorkToPod = (nextStep) => ({
  GetUnassignedPod: {
    XStepType: 'get-unassigned-pod',
    Next: 'IsPodAvailable',
    ResultPath: '$.Data',
  },
  IsPodAvailable: {
    Type: 'Choice',
    Choices: [
      {
        Variable: '$.Data.ResponseBody.items[0]',
        IsPresent: false,
        Next: 'Wait',
      },
    ],
    Default: 'AssignPodToPipeline',
  },
  Wait: {
    Type: 'Wait',
    Seconds: 2,
    Next: 'GetUnassignedPod',
  },
  AssignPodToPipeline: {
    XStepType: 'assign-pod-to-pipeline',
    Next: 'IsPatchSuccessful',
    ResultPath: '$.PatchResult',
  },
  IsPatchSuccessful: {
    Type: 'Choice',
    Choices: [
      {
        Not: {
          // probably check here if an activty ARN has been assigned
          Variable: '$.PatchResult.StatusCode',
          NumericEquals: 200,
        },
        Next: 'GetUnassignedPod',
      },
    ],
    Default: nextStep,
  },
});


const buildInitialSteps = (nextStep) => {
  // if we are running locally launch a pipeline job
  if (config.clusterEnv === 'development') {
    return createLocalPipeline(nextStep);
  }
  // if we are in staging / production wait for an activity to be assigned
  return assignWorkToPod(nextStep);
};

const firstStep = () => {
  if (config.clusterEnv === 'development') {
    return 'DeleteCompletedPipelineWorker';
  }

  return 'GetUnassignedPod';
};

module.exports = { firstStep, buildInitialSteps };
