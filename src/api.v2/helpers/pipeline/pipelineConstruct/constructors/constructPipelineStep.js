const deleteCompletedJobs = require('./deleteCompleteJobs');
const createNewJobIfNotExist = require('./createNewJobIfNotExist');
const createNewStep = require('./createNewStep');
const createHandleErrorStep = require('./createHandleErrorStep');
const submitBatchJob = require('./submitBatchJob');
const {
  requestPod, waitForPod,
} = require('./requestAssignPodToPipeline');

const constructPipelineStep = (context, step) => {
  const { XStepType: stepType, XConstructorArgs: args } = step;

  switch (stepType) {
    // Local steps
    case 'delete-completed-jobs': {
      return deleteCompletedJobs(context, step);
    }
    case 'create-new-job-if-not-exist': {
      return createNewJobIfNotExist(context, step);
    }
    // create new job for big datasets in aws
    case 'submit-batch-job': {
      return submitBatchJob(context, step);
    }
    // Remote (aws) steps
    case 'request-pod': {
      return requestPod(context, step);
    }
    case 'wait-for-pod': {
      return waitForPod(context, step);
    }
    // used both locally and in aws
    case 'create-new-step': {
      return createNewStep(context, step, args);
    }
    case 'create-handle-error-step': {
      return createHandleErrorStep(context, step);
    }
    default: {
      throw new Error(`Invalid state type specified: ${stepType}`);
    }
  }
};

module.exports = constructPipelineStep;
