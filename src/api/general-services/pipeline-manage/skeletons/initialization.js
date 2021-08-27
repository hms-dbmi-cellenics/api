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
    Default: 'PatchPod',
  },
  Wait: {
    Type: 'Wait',
    Seconds: 2,
    Next: 'GetUnassignedPod',
  },
  PatchPod: {
    XStepType: 'patch-pod',
    Next: 'IsPatchSuccessful',
  },
  IsPatchSuccessful: {
    Type: 'Choice',
    Choices: [
      {
        Not: {
          // probably check here if an activty ARN has been assigned
          Variable: '$.StatusCode',
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
    return createLocalPipeline;
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
