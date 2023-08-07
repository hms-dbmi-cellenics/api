const AWSXRay = require('aws-xray-sdk');

const { OK } = require('../../utils/responses');

const { createQCPipeline } = require('../helpers/pipeline/pipelineConstruct');
const handleQCResponse = require('../helpers/pipeline/handleQCResponse');

const getLogger = require('../../utils/getLogger');
const parseSNSMessage = require('../../utils/parseSNSMessage');
const snsTopics = require('../../config/snsTopics');

const logger = getLogger('[QCController] - ');

const runQC = async (stateMachineParams, authorization) => {
  const { experimentId, processingConfig } = stateMachineParams;

  logger.log(`Starting qc for experiment ${experimentId}`);

  await createQCPipeline(
    experimentId,
    processingConfig || [],
    authorization,
  );

  logger.log(`Started qc for experiment ${experimentId} successfully, `);
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
      await handleQCResponse(io, parsedMessage);
    } catch (e) {
      logger.error(
        'qc pipeline response handler failed with error: ', e,
      );

      AWSXRay.getSegment().addError(e);
      res.status(200).send('nok');
      return;
    }
  }

  res.status(200).send('ok');
};

const handleQCRequest = async (req, res) => {
  const stateMachineParams = {
    experimentId: req.params.experimentId,
    processingConfig: req.body.processingConfig,
  };

  await runQC(stateMachineParams, req.headers.authorization);
  res.json(OK());
};

module.exports = {
  handleQCRequest,
  handleResponse,
};
