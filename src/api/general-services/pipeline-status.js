const _ = require('lodash');
const crypto = require('crypto');
const AWS = require('../../utils/requireAWS');
const ExperimentService = require('../route-services/experiment');
const config = require('../../config');
const getLogger = require('../../utils/getLogger');
const pipelineConstants = require('./pipeline-manage/constants');
const constants = require('./pipeline-manage/constants');

const logger = getLogger();

const privateSteps = [
  'DeleteCompletedPipelineWorker', 'LaunchNewPipelineWorker',
  'AssignPipelineToPod', 'GetUnassignedPod', 'IsPodAvailable',
  'NoPodsAvailable', 'AssignPodToPipeline', 'GetExperimentRunningPods',
  'DeletePreviousPods', 'DeletePod', 'Ignore404',
];


const notCreatedStatus = {
  startDate: null,
  stopDate: null,
  status: pipelineConstants.NOT_CREATED,
  error: false,
  completedSteps: [],
};

const date = (new Date()).toISOString();
const mockedCompletedStatus = {
  qc: {
    startDate: date,
    stopDate: date,
    status: 'SUCCEEDED',
    completedSteps: [
      'ClassifierFilter',
      'CellSizeDistributionFilter',
      'MitochondrialContentFilter',
      'NumGenesVsNumUmisFilter',
      'DoubletScoresFilter',
      'DataIntegration',
      'ConfigureEmbedding'],
  },
  gem2s: {
    startDate: date,
    stopDate: date,
    status: 'SUCCEEDED',
    completedSteps: [
      'DownloadGem',
      'PreProcessing',
      'EmptyDrops',
      'DoubletScores',
      'CreateSeurat',
      'PrepareExperiment',
      'UploadToAWS'],
  },
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

  const shortestCompletedToReport = _.difference(shortestCompleted, privateSteps);

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

  // if there aren't ARNs just return NOT_CREATED status
  if (!executionArn.length) {
    return {
      [processName]: notCreatedStatus,
    };
  }

  const stepFunctions = new AWS.StepFunctions({
    region: config.awsRegion,
  });

  try {
    execution = await stepFunctions.describeExecution({
      executionArn,
    }).promise();
  } catch (e) {
    // state machines in staging are removed after some time, in this situation we return
    // NOT_CREATED status so that the pipeline can be run again
    if (config.clusterEnv === 'staging' && e.code === pipelineConstants.EXECUTION_DOES_NOT_EXIST) {
      return {
        [processName]: notCreatedStatus,
      };
    }

    // if we get the execution does not exist it means we are using a pulled experiment so
    // just return a mock sucess status
    if (
      (config.clusterEnv === 'development' && e.code === pipelineConstants.EXECUTION_DOES_NOT_EXIST)
      || (config.clusterEnv === 'staging' && e.code === pipelineConstants.ACCESS_DENIED)
    ) {
      logger.log(
        `Returning a mocked success ${processName} - pipeline status because ARN ${executionArn} `
        + `does not exist and we are running in ${config.clusterEnv} so we are assuming the experiment was`
        + ' pulled from another env.',
      );

      return {
        [processName]: mockedCompletedStatus[processName],
      };
    }

    throw e;
  }

  /* eslint-disable no-await-in-loop */
  let events = [];
  let nextToken;
  do {
    const history = await stepFunctions.getExecutionHistory({
      executionArn,
      includeExecutionData: false,
      nextToken,
    }).promise();

    events = [...events, ...history.events];
    nextToken = history.nextToken;
  } while (nextToken);

  error = _.findLast(events, (elem) => elem.type === 'ExecutionFailed');

  if (error) {
    error = error.executionFailedEventDetails;
  }

  completedSteps = getStepsFromExecutionHistory(events);

  let { status } = execution;
  if (processName === constants.GEM2S_PROCESS_NAME && status === pipelineConstants.SUCCEEDED) {
    const Gem2sService = require('../route-services/gem2s');
    const { hashParams } = await Gem2sService.generateGem2sParams(experimentId);
    const paramsHash = crypto
      .createHash('sha1')
      .update(JSON.stringify(hashParams))
      .digest('hex');
    const shouldRun = await Gem2sService.gem2sShouldRun(experimentId, paramsHash, status);
    if (shouldRun) {
      status = constants.NEEDS_RERUN;
      completedSteps = [];
    }
  }
  const response = {
    [processName]: {
      startDate: execution.startDate,
      stopDate: execution.stopDate,
      status,
      error,
      completedSteps,
    },
  };

  return response;
};

module.exports = getPipelineStatus;

module.exports.getStepsFromExecutionHistory = getStepsFromExecutionHistory;
