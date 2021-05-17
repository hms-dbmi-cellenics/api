const AWS = require('../../utils/requireAWS');
const ExperimentService = require('../route-services/experiment');
const config = require('../../config');
const logger = require('../../utils/logging');

const getStepsFromExecutionHistory = require('../../utils/getStepsFromExecutionHistory');

const supportingSteps = ['DeleteCompletedPipelineWorker', 'LaunchNewPipelineWorker'];

/*
     * Return `completedSteps` of the state machine (SM) associated to the `experimentId`'s pipeline
     * The code assumes that
     *  - the relevant states for the steps are defined within a Map of the SM
     *  - the relevant Map is the first Map in the SM
     *  - a step is only considered completed if it has been completed for all iteration of the Map
     *  - steps are returned in the completion order, and are unique in the returned array
     */
const gem2sStatus = async (experimentId) => {
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
    /* eslint-enable no-await-in-loop */

    completedSteps = getStepsFromExecutionHistory(events, supportingSteps);
    logger.log(`ExecutionHistory for ARN ${executionArn}: ${events.length} events, ${completedSteps.length} completed steps`);
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

module.exports = gem2sStatus;
