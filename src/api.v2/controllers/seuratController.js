const AWSXRay = require('aws-xray-sdk');

const { startSeuratPipeline, handleSeuratResponse } = require('../helpers/pipeline/seurat');
const { OK, MethodNotAllowedError } = require('../../utils/responses');
const getLogger = require('../../utils/getLogger');
const parseSNSMessage = require('../../utils/parseSNSMessage');
const snsTopics = require('../../config/snsTopics');
const ExperimentParent = require('../model/ExperimentParent');

const logger = getLogger('[SeuratController] - ');

const runSeurat = async (stateMachineParams, authorization) => {
  const { experimentId } = stateMachineParams;

  logger.log(`Starting seurat for experiment ${experimentId}`);

  const { parentExperimentId = null } = await new ExperimentParent()
    .find({ experiment_id: experimentId })
    .first();

  if (parentExperimentId) {
    throw new MethodNotAllowedError(`Experiment ${experimentId} can't run seurat`);
  }

  const newExecution = await startSeuratPipeline(stateMachineParams, authorization);

  logger.log(`Started seurat for experiment ${experimentId} successfully, `);
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
      await handleSeuratResponse(io, parsedMessage);
    } catch (e) {
      logger.error(
        'seurat pipeline response handler failed with error: ', e,
      );

      AWSXRay.getSegment().addError(e);
      res.status(200).send('nok');
      return;
    }
  }

  res.status(200).send('ok');
};

const handleSeuratRequest = async (req, res) => {
  const stateMachineParams = {
    experimentId: req.params.experimentId,
  };

  await runSeurat(stateMachineParams, req.headers.authorization);
  res.json(OK());
};

module.exports = {
  handleSeuratRequest,
  handleResponse,
};
