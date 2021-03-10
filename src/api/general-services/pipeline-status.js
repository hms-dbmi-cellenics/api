const AWS = require('../../utils/requireAWS');
const ExperimentService = require('../route-services/experiment');
const config = require('../../config');

const getStepsFromExecutionHistory = () => [];

const getPipelineStatus = async (experimentId) => {
  const { executionArn } = await (new ExperimentService()).getPipelineHandle(experimentId);

  const stepFunctions = new AWS.StepFunctions({
    region: config.awsRegion,
  });
  const execution = await stepFunctions.describeExecution({
    executionArn,
  }).promise();

  /*
  const smDescription = await stepFunctions.describeStateMachineForExecution({
    executionArn,
  }).promise();
  const smDefinition = JSON.parse(smDescription.definition);
  const history = await stepFunctions.getExecutionHistory({
    executionArn,
    includeExecutionData: false,
  }).promise();

  console.log(JSON.stringify(smDefinition, null, 2));
  console.log(JSON.stringify(execution, null, 2));
  console.log(JSON.stringify(history, null, 2));
  */

  const response = {
    pipeline: {
      startDate: execution.startDate,
      stopDate: execution.stopDate,
      status: execution.status,
      completedSteps: [],
    },
  };
  return response;
};

module.exports = getPipelineStatus;
module.exports.getStepsFromExecutionHistory = getStepsFromExecutionHistory;
