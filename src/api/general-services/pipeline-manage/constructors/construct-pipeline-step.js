const deleteCompletedJobs = require('./delete-complete-jobs');
const createNewStep = require('./create-new-step');
const createNewJobIfNotExist = require('./create-new-job-if-not-exist');
const assignPodToPipeline = require('./assign-pod-to-pipeline');

const constructPipelineStep = (context, step) => {
  const { XStepType: stepType, XConstructorArgs: args } = step;

  switch (stepType) {
    // deletes completed jobs when running locally
    case 'delete-completed-jobs': {
      return deleteCompletedJobs(context, step, args);
    }
    // used to create a new job when running locally
    case 'create-new-job-if-not-exist': {
      return createNewJobIfNotExist(context, step, args);
    }
    // assigning the pipeline to a running pod (staging/production)
    case 'initialize-infra': {
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
