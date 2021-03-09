const deleteCompletedJobs = require('./delete-complete-jobs');
const createNewStep = require('./create-new-step');
const createNewJobIfNotExist = require('./create-new-job-if-not-exist');
const multiplyBySamples = require('./multiply-by-samples');

const constructPipelineStep = (context, step) => {
  const { XStepType: stepType, XConstructorArgs: args } = step;

  switch (stepType) {
    case 'delete-completed-jobs': {
      return deleteCompletedJobs(context, step, args);
    }
    case 'create-new-job-if-not-exist': {
      return createNewJobIfNotExist(context, step, args);
    }
    case 'create-new-step': {
      return createNewStep(context, step, args);
    }
    case 'multiply-by-samples': {
      return multiplyBySamples(context, step, { constructor: constructPipelineStep });
    }
    default: {
      throw new Error(`Invalid state type specified: ${stepType}`);
    }
  }
};

module.exports = constructPipelineStep;
