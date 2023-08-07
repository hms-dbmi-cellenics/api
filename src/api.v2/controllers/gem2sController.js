const AWSXRay = require('aws-xray-sdk');

const { startGem2sPipeline, handleGem2sResponse } = require('../helpers/pipeline/gem2s');
const { OK, MethodNotAllowedError } = require('../../utils/responses');
const getLogger = require('../../utils/getLogger');
const parseSNSMessage = require('../../utils/parseSNSMessage');
const snsTopics = require('../../config/snsTopics');
const ExperimentParent = require('../model/ExperimentParent');

const logger = getLogger('[Gem2sController] - ');

const runGem2s = async (stateMachineParams, authorization) => {
  const { experimentId } = stateMachineParams;

  logger.log(`Starting gem2s for experiment ${experimentId}`);

  const { parentExperimentId = null } = await new ExperimentParent()
    .find({ experiment_id: experimentId })
    .first();
  if (parentExperimentId) {
    throw new MethodNotAllowedError(`Experiment ${experimentId} can't run gem2s`);
  }

  const newExecution = await startGem2sPipeline(stateMachineParams, authorization);

  logger.log(`Started gem2s for experiment ${experimentId} successfully, `);
  logger.log('New executions data:');
  logger.log(JSON.stringify(newExecution));
};

const handleResponse = async (req, res) => {
  let result;

  try {
    result = await parseSNSMessage(req, snsTopics.WORK_RESULTS);
  } catch (e) {
    logger.error('Parsing initial SNS message failed:', e);
    AWSXRay.getSegment().addError(e);
    res.status(200).send('nok');
    return;
  }

  const { io, parsedMessage } = result;

  const isSnsNotification = parsedMessage !== undefined;
  if (isSnsNotification) {
    try {
      await handleGem2sResponse(io, parsedMessage);
    } catch (e) {
      logger.error(
        'gem2s pipeline response handler failed with error: ', e,
      );

      AWSXRay.getSegment().addError(e);
      res.status(200).send('nok');
      return;
    }
  }

  res.status(200).send('ok');
};

const handleGem2sRequest = async (req, res) => {
  const stateMachineParams = { experimentId: req.params.experimentId };

  await runGem2s(stateMachineParams, req.headers.authorization);

  res.json(OK());
};

module.exports = {
  handleGem2sRequest,
  handleResponse,
};
