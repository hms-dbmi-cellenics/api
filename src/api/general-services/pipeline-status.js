const _ = require('lodash');
const AWS = require('../../utils/requireAWS');
const ExperimentService = require('../route-services/experiment');
const config = require('../../config');
const getLogger = require('../../utils/getLogger');
const pipelineConstants = require('./pipeline-manage/constants');
const { getPipelineStepNames } = require('./pipeline-manage/skeletons');

const logger = getLogger();

// TODO: this lists should be computed from the actual state machines skeletons
const qcPipelineSteps = [
  'ClassifierFilter',
  'CellSizeDistributionFilter',
  'MitochondrialContentFilter',
  'NumGenesVsNumUmisFilter',
  'DoubletScoresFilter',
  'DataIntegration',
  'ConfigureEmbedding'];

const gem2sPipelineSteps = [
  'DownloadGem',
  'PreProcessing',
  'EmptyDrops',
  'DoubletScores',
  'CreateSeurat',
  'PrepareExperiment',
  'UploadToAWS'];

// pipelineStepNames are the names of pipeline steps for which we
// want to report the progress back to the user
// does not include steps used to initialize the infrastructure (like pod deletion assignation)
const pipelineSteps = getPipelineStepNames();

// buildResponse function is wrapper function to ensure that all pipeline-status
// responses contain the same information and parameters
// more specific building response should rely on calling this one
const buildResponse = (processName, execution, paramsHash, error, completedSteps) => {
  const response = {
    [processName]: {
      startDate: execution.startDate,
      stopDate: execution.stopDate,
      status: execution.status,
      error,
      completedSteps,
      paramsHash,
    },
  };
  return response;
};

const buildNotCreatedStatus = (processName) => {
  const execution = {
    startDate: null,
    stopDate: null,
    status: pipelineConstants.NOT_CREATED,
  };
  const paramsHash = undefined;
  const error = false;
  const completedSteps = [];
  return buildResponse(processName, execution, paramsHash, error, completedSteps);
};

const buildCompletedStatus = (processName, date, paramsHash) => {
  const execution = {
    startDate: date,
    stopDate: date,
    status: pipelineConstants.SUCCEEDED,
  };
  const error = false;
  let completedSteps;

  switch (processName) {
    case pipelineConstants.GEM2S_PROCESS_NAME:
      completedSteps = gem2sPipelineSteps;
      break;
    case pipelineConstants.QC_PROCESS_NAME:
      completedSteps = qcPipelineSteps;
      break;
    default:
      throw new Error(`Unknown processName ${processName}`);
  }
  return buildResponse(processName, execution, paramsHash, error, completedSteps);
};


const getExecutionHistory = async (stepFunctions, executionArn) => {
  let events = [];
  let nextToken;
  do {
    // eslint-disable-next-line no-await-in-loop
    const history = await stepFunctions.getExecutionHistory({
      executionArn,
      includeExecutionData: false,
      nextToken,
    }).promise();

    events = [...events, ...history.events];
    nextToken = history.nextToken;
  } while (nextToken);

  return events;
};

const checkError = (events) => {
  const error = _.findLast(events, (elem) => elem.type === 'ExecutionFailed');

  if (error) {
    return error.executionFailedEventDetails;
  }

  return false;
};

const getStepsFromExecutionHistory = (events) => {
  class Branch {
    constructor(event, makeRoot) {
      this.visited = [event.id];
      this.currentState = '';
      this.completedTasks = [];
      this.branches = {};
      this.branchCount = 0;
      this.updateCurrentState(event);
      if (makeRoot) {
        this.visited.push(event.previousEventId);
      }
    }

    workingOnBranches() {
      return this.branchCount === Object.values(this.branches).length;
    }

    updateCurrentState(event) {
      if ('stateEnteredEventDetails' in event) {
        this.currentState = event.stateEnteredEventDetails.name;
      }
    }

    nextConsumer(event) {
      if (this.visited.includes(event.previousEventId)) {
        return this;
      }

      if (event.type === 'MapStateExited') {
        return this;
      }

      const branches = Object.values(this.branches);
      for (let ii = 0; ii < branches.length; ii += 1) {
        const candidate = branches[ii];
        const consumer = candidate.nextConsumer(event);
        if (consumer) {
          return consumer;
        }
      }
      return null;
    }

    consume(event) {
      if (event.type === 'MapIterationStarted') {
        this.branches[event.mapIterationStartedEventDetails.index] = new Branch(event);
      } else {
        this.visited.push(event.id);
        this.updateCurrentState(event);
        if (event.type === 'TaskSucceeded' || event.type === 'ActivitySucceeded') {
          this.completedTasks.push(this.currentState);
        } else if (event.type === 'MapStateStarted') {
          this.branchCount = event.mapStateStartedEventDetails.length;
        } else if (event.type === 'MapStateExited') {
          // a map state can have 0 iterations; e.g. trying to delete previous experiments'
          // so MapIterationStared won't exist and thus branch won't either
          if (this.branches[0] !== undefined) {
            this.completedTasks = this.completedTasks.concat(this.branches[0].completedTasks);
            this.branches = {};
            this.branchCount = 0;
          }
        }
      }
    }
  }

  if (!events.length) {
    return [];
  }

  const main = new Branch(events[0], true);
  for (let ii = 1; ii < events.length; ii += 1) {
    const consumer = main.nextConsumer(events[ii]);
    consumer.consume(events[ii]);
  }

  let shortestCompleted = null;

  if (main.workingOnBranches()) {
    const branches = Object.values(main.branches);
    for (let ii = 0; ii < branches.length; ii += 1) {
      if (!shortestCompleted || branches[ii].completedTasks.length < shortestCompleted.length) {
        shortestCompleted = branches[ii].completedTasks;
      }
    }
  }

  shortestCompleted = (shortestCompleted || []).concat(main.completedTasks);

  const shortestCompletedToReport = _.filter(shortestCompleted, (s) => pipelineSteps.includes(s));

  return shortestCompletedToReport || [];
};


/*
     * Return `completedSteps` of the state machine (SM) associated to the `experimentId`'s pipeline
     * The code assumes that
     *  - a step is only considered completed if it has been completed for all iteration of the Map
     *  - steps are returned in the completion order, and are unique in the returned array
     */
const getPipelineStatus = async (experimentId, processName) => {
  const experimentService = new ExperimentService();

  const pipelinesHandles = await experimentService.getPipelinesHandles(experimentId);

  const { executionArn } = pipelinesHandles[processName];

  let execution = {};
  let completedSteps = [];
  let error = false;
  // only used in gem2s, will just be undefined for qc
  const { paramsHash } = pipelinesHandles[processName] || {};

  // if there aren't ARNs just return NOT_CREATED status
  if (executionArn === '') {
    return buildNotCreatedStatus(processName);
  }

  const stepFunctions = new AWS.StepFunctions({
    region: config.awsRegion,
  });

  try {
    execution = await stepFunctions.describeExecution({
      executionArn,
    }).promise();
  } catch (e) {
    // if we get the execution does not exist it means we are using a pulled experiment so
    // just return a mock sucess status
    // TODO: state machines in production are deleted after 90 days, return a successful execution
    // if the execution does not exist in production so the user will not be forced to re-run
    // the pipeline losing annotations. This will be addressed checking if the
    // processed files exist in S3 to avoid allowing users to move onwards when the pipeline was not
    // actually run.
    if ((e.code === pipelineConstants.EXECUTION_DOES_NOT_EXIST)
      || (config.clusterEnv === 'staging' && e.code === pipelineConstants.ACCESS_DENIED)) {
      logger.log(
        `Returning a mocked success ${processName} - pipeline status because ARN ${executionArn} `
        + `does not exist and we are running in ${config.clusterEnv} so it means it's either a `
        + ' a pulled experiment or that the production state machine expired and was deleted by aws.',
      );

      // we set as date 90 days ago which is when the state machine expire in production, in
      // staging dev we don't care about this
      const ninetyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 90));

      return buildCompletedStatus(processName, ninetyDaysAgo, paramsHash);
    }

    throw e;
  }

  const events = await getExecutionHistory(stepFunctions, executionArn);

  error = checkError(events);
  completedSteps = getStepsFromExecutionHistory(events);

  return buildResponse(processName, execution, paramsHash, error, completedSteps);
};

module.exports = getPipelineStatus;

module.exports.getStepsFromExecutionHistory = getStepsFromExecutionHistory;
module.exports.buildCompletedStatus = buildCompletedStatus;
module.exports.checkError = checkError;
