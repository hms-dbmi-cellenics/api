import { createNewJobIfNotExist } from './create-new-job-if-not-exist';

const deleteCompletedJobs = require('./delete-complete-jobs');
const createNewStep = require('./create-new-step');
// const createNewJobIfNotExist = require('./create-new-job-if-not-exist');
const { getRunningPods, deleteRunningPods, assignPodToPipeline } = require('./assign-pod-to-pipeline');
// const createNewJobIfNotExist = require('./create-new-job-if-not-exist');
export function constructPipelineStep (context: Context, step: MetaStep) {
  const { XStepType: stepType, XConstructorArgs: args } = step;

  switch (stepType) {
    // Local steps
    case 'delete-completed-jobs': {
      return deleteCompletedJobs(context, step, args);
    }
    case 'create-new-job-if-not-exist': {
      return createNewJobIfNotExist(context, step, args);
    }

    // Remote (aws) steps
    case 'get-running-pods': {
      return getRunningPods(context, step, args);
    }
    case 'delete-running-pods': {
      return deleteRunningPods(context, step, args);
    }
    case 'assign-pipeline-to-pod': {
      return assignPodToPipeline(context, step, args);
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