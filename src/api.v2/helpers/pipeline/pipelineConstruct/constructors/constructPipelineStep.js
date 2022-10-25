const deleteCompletedJobs = require('./deleteCompleteJobs');
const createNewStep = require('./createNewStep');
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
    default: {
      throw new Error(`Invalid state type specified: ${stepType}`);
    }
  }
};

module.exports = constructPipelineStep;
