const deleteCompletedJobs = require('./delete-complete-jobs');
const createNewStep = require('./create-new-step');
const createNewJobIfNotExist = require('./create-new-job-if-not-exist');
const getUnassignedPod = require('./get-unassigned-pod');
const assignPodToPipeline = require('./assign-pod-to-pipeline');

const constructPipelineStep = (context, step) => {
  const { XStepType: stepType, XConstructorArgs: args } = step;

  switch (stepType) {
    case 'delete-completed-jobs': {
      return deleteCompletedJobs(context, step, args);
    }
    case 'create-new-job-if-not-exist': {
      return createNewJobIfNotExist(context, step, args);
    }
    case 'get-unassigned-pod': {
      return getUnassignedPod(context, step, args);
    }
    case 'assign-pod-to-pipeline': {
      return assignPodToPipeline(context, step, args);
    }
    case 'create-new-step': {
      return createNewStep(context, step, args);
    }
    default: {
      throw new Error(`Invalid state type specified: ${stepType}`);
    }
  }
};

module.exports = constructPipelineStep;
