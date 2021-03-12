const AWS = require('../../utils/requireAWS');
const ExperimentService = require('../route-services/experiment');
const config = require('../../config');
const logger = require('../../utils/logging');

const getStepsFromExecutionHistory = (history) => {
  const { events } = history;
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

    allBranchesStarted() {
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
        if (event.type === 'TaskSucceeded') {
          this.completedTasks.push(this.currentState);
        } else if (event.type === 'MapStateStarted') {
          this.branchCount = event.mapStateStartedEventDetails.length;
        }
      }
    }
  }
  const main = new Branch(events[0], true);
  for (let ii = 1; ii < events.length; ii += 1) {
    const consumer = main.nextConsumer(events[ii]);
    consumer.consume(events[ii]);
  }
  let shortestCompleted = null;
  if (main.allBranchesStarted()) {
    const branches = Object.values(main.branches);
    for (let ii = 0; ii < branches.length; ii += 1) {
      if (!shortestCompleted || branches[ii].completedTasks.length < shortestCompleted.length) {
        shortestCompleted = branches[ii].completedTasks;
      }
    }
  }
  return shortestCompleted || [];
};

/*
 * Return the `completedSteps` of the state machine (SM) associated to the `experimentId`'s pipeline
 * The code assumes that
 *  - the relevant states for the steps are defined within a Map of the SM
 *  - the relevant Map is the first Map in the SM
 *  - a step is only considered completed if it has been completed for all iteration of the Map
 *  - steps are returned in the completion order, and are unique in the returned array
 */
const getPipelineStatus = async (experimentId) => {
  const { executionArn } = await (new ExperimentService()).getPipelineHandle(experimentId);
  let execution = {};
  let completedSteps = [];
  if (!executionArn.length) {
    execution = {
      startDate: null,
      stopDate: null,
      status: 'NotCreated',
    };
  } else {
    const stepFunctions = new AWS.StepFunctions({
      region: config.awsRegion,
    });
    execution = await stepFunctions.describeExecution({
      executionArn,
    }).promise();
    const history = await stepFunctions.getExecutionHistory({
      executionArn,
      includeExecutionData: false,
    }).promise();

    completedSteps = getStepsFromExecutionHistory(history);
    logger.log(`ExecutionHistory for ARN ${executionArn}: ${history.events.length} events, ${completedSteps.length} completed steps`);
  }

  const response = {
    pipeline: {
      startDate: execution.startDate,
      stopDate: execution.stopDate,
      status: execution.status,
      completedSteps,
    },
  };
  return response;
};

module.exports = getPipelineStatus;
module.exports.getStepsFromExecutionHistory = getStepsFromExecutionHistory;
