const AWSXRay = require('aws-xray-sdk');

const { createSeuratPipeline, handleSeuratResponse } = require('../helpers/pipeline/seurat');
const { OK } = require('../../utils/responses');
const getLogger = require('../../utils/getLogger');
const parseSNSMessage = require('../../utils/parse-sns-message');

const logger = getLogger('[SeuratController] - ');

const runSeurat = async (req, res) => {
  const { experimentId } = req.params;

  logger.log(`Starting seurat for experiment ${experimentId}`);

  const newExecution = await
  createSeuratPipeline(experimentId, req.body, req.headers.authorization);

  logger.log(`Started seurat for experiment ${experimentId} successfully, `);
  logger.log('New executions data:');
  logger.log(JSON.stringify(newExecution));

  res.json(OK());
};

const handleResponse = async (req, res) => {
  let result;

  try {
    result = await parseSNSMessage(req);
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

module.exports = {
  runSeurat,
  handleResponse,
};
