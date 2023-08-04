const _ = require('lodash');
const AWS = require('../../../utils/requireAWS');

const ExperimentExecution = require('../../model/ExperimentExecution');

const config = require('../../../config');
const { EXPIRED_EXECUTION_DATE } = require('../../constants');
const getLogger = require('../../../utils/getLogger');
const pipelineConstants = require('../../constants');
const { getPipelineStepNames } = require('./pipelineConstruct/skeletons');
const shouldGem2sRerun = require('./shouldGem2sRerun');
const { qcStepNames, stepNameToBackendStepNames } = require('./pipelineConstruct/constructors/qcStepNameTranslations');

const logger = getLogger();

// TODO: this lists should be computed from the actual state machines skeletons
const qcPipelineSteps = [
  'ClassifierFilter',
  'CellSizeDistributionFilter',
  'MitochondrialContentFilter',
  'NumGenesVsNumUmisFilter',
  'DoubletScoresFilter',
  'DataIntegration',
  'ConfigureEmbedding',
];

const gem2sPipelineSteps = [
  'DownloadGem',
  'PreProcessing',
  'EmptyDrops',
  'DoubletScores',
  'CreateSeurat',
  'PrepareExperiment',
  'UploadToAWS',
];

const seuratPipelineSteps = [
  'DownloadSeurat',
  'ProcessSeurat',
  'UploadSeuratToAWS',
];

// pipelineStepNames are the names of pipeline steps for which we
// want to report the progress back to the user
// does not include steps used to initialize the infrastructure (like pod deletion assignation)
const pipelineSteps = getPipelineStepNames();

// buildResponse function is wrapper function to ensure that all pipeline-status
// responses contain the same information and parameters
// more specific building response should rely on calling this one
const buildResponse = (processName, execution, shouldRerun, error, completedSteps) => {
  const response = {
    [processName]: {
      startDate: execution.startDate,
      stopDate: execution.stopDate,
      status: execution.status,
      error,
      completedSteps,
      shouldRerun,
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
  const shouldRerun = true;
  const error = false;
  const completedSteps = [];
  return buildResponse(processName, execution, shouldRerun, error, completedSteps);
};

const buildCompletedStatus = (processName, date, shouldRerun) => {
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
    case pipelineConstants.SEURAT_PROCESS_NAME:
      completedSteps = seuratPipelineSteps;
      break;
    case pipelineConstants.QC_PROCESS_NAME:
      completedSteps = qcPipelineSteps;
      break;
    default:
      throw new Error(`Unknown processName ${processName}`);
  }
  return buildResponse(processName, execution, shouldRerun, error, completedSteps);
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
  const error = _.findLast(events, (elem) => elem.type === 'ActivityFailed');

  if (error) {
    return error.activityFailedEventDetails;
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

/**
 *
 * @param {*} processName The name of the pipeline to get the steps for,
 * currently either qc or gem2s
 * @param {*} stateMachineArn
 * @param {*} lastRunExecutedSteps The steps that were executed in the last run
 * @param {*} stepFunctions stepFunctions client
 * @returns array of steps that can be considered completed
 *
 * If processName = gem2s, it returns executedSteps because we don't support partial reruns so
 * we can always assume all executedSteps are all completed steps
 *
 * If processName = qc: it returns lastRunExecutedSteps + stepsCompletedInPreviousRuns
 * stepsCompletedInPreviousRuns is all the steps that weren't scheduled to run in the last run
 * The only reason we don't schedule steps is when we consider them completed,
 * so we can keep considering them completed for future runs as well
 */
const getCompletedSteps = async (
  processName, stateMachineArn, lastRunExecutedSteps, stepFunctions,
) => {
  let completedSteps;

  if (processName === 'qc') {
    const stateMachine = await stepFunctions.describeStateMachine({
      stateMachineArn,
    }).promise();

    // Get all the steps that were scheduled to be run in the last execution
    const lastScheduledSteps = Object.keys(JSON.parse(stateMachine.definition).States);

    // Remove from all qc steps the ones that were scheduled for execution in the last run
    // We are left with all the qc steps that last run didn't consider necessary to rerun
    // This means that these steps were considered completed in the last run so
    // we can still consider them completed
    const stepsCompletedInPreviousRuns = _.difference(qcStepNames, lastScheduledSteps)
      .map((rawStepName) => stepNameToBackendStepNames[rawStepName]);

    completedSteps = stepsCompletedInPreviousRuns.concat(lastRunExecutedSteps);
  } if (processName === 'gem2s' || processName === 'seurat') {
    completedSteps = lastRunExecutedSteps;
  }

  return completedSteps;
};

/*
     * Return `completedSteps` of the state machine (SM) associated to the `experimentId`'s pipeline
     * The code assumes that
     *  - a step is only considered completed if it has been completed for all iteration of the Map
     *  - steps are returned in the completion order, and are unique in the returned array
     */
const getPipelineStatus = async (experimentId, processName) => {
  const executions = await new ExperimentExecution().find({ experiment_id: experimentId });

  const pipelineExecution = _.find(executions, { pipelineType: processName });

  // if there aren't ARNs just return NOT_CREATED status
  if (_.isNil(pipelineExecution)) {
    return buildNotCreatedStatus(processName);
  }

  const stepFunctions = new AWS.StepFunctions({
    region: config.awsRegion,
  });


  let execution = {};
  let error = false;
  let response = null;

  const { executionArn = null, stateMachineArn = null, lastStatusResponse } = pipelineExecution;
  const shouldRerun = await shouldGem2sRerun(experimentId, processName);

  try {
    execution = await stepFunctions.describeExecution({
      executionArn,
    }).promise();

    const events = await getExecutionHistory(stepFunctions, executionArn);
    error = checkError(events);

    const executedSteps = getStepsFromExecutionHistory(events);

    const completedSteps = await getCompletedSteps(
      processName, stateMachineArn, executedSteps, stepFunctions,
    );

    response = buildResponse(processName, execution, shouldRerun, error, completedSteps);
  } catch (e) {
    // if we get the execution does not exist it means we are using a pulled experiment so
    // just return a mock sucess status
    // TODO: state machines in production are deleted after 90 days, return a successful execution
    // if the execution does not exist in production so the user will not be forced to re-run
    // the pipeline losing annotations. This will be addressed checking if the
    // processed files exist in S3 to avoid allowing users to move onwards when the pipeline was not
    // actually run.

    if (
      (e.code === pipelineConstants.EXECUTION_DOES_NOT_EXIST)
      || (config.clusterEnv === 'staging' && e.code === pipelineConstants.ACCESS_DENIED)
    ) {
      if (lastStatusResponse) {
        logger.log(`Returning status stored in sql because AWS doesn't find arn ${executionArn}`);
        // Update the shouldRerun just in case it changed
        response = { [processName]: { ...lastStatusResponse[processName], shouldRerun } };
      } else {
        logger.log(
          `Returning a mocked success ${processName} - pipeline status because ARN ${executionArn} `
          + `does not exist in aws and we are running in ${config.clusterEnv} so it means it's either a `
          + 'a pulled experiment or this is a very old legacy experiment from before sql that (legacy) '
          + 'doesn\'t have its latest execution stored in sql.',
        );

        // we set a custom date that can be used by the UI to reliably generate ETag
        const fixedPipelineDate = EXPIRED_EXECUTION_DATE;

        response = buildCompletedStatus(processName, fixedPipelineDate, shouldRerun);
      }
    } else {
      throw e;
    }
  }

  // If the new response changed compared to the stored one, update sql one
  if (!_.isEqual(response, lastStatusResponse)) {
    await new ExperimentExecution().update(
      { experiment_id: experimentId, pipeline_type: processName },
      { last_status_response: response },
    );
  }

  return response;
};

module.exports = getPipelineStatus;

module.exports.getStepsFromExecutionHistory = getStepsFromExecutionHistory;
module.exports.buildCompletedStatus = buildCompletedStatus;
module.exports.checkError = checkError;
