const _ = require('lodash');
const { OK } = require('../../utils/responses');

const { createQCPipeline } = require('../helpers/pipeline/pipelineConstruct');
const handleQCResponse = require('../helpers/pipeline/handleQCResponse');

const getLogger = require('../../utils/getLogger');
const parseSNSMessage = require('../../utils/parseSNSMessage');
const snsTopics = require('../../config/snsTopics');
const Experiment = require('../model/Experiment');

const logger = getLogger('[QCController] - ');

const runQC = async (req, res) => {
  const { experimentId } = req.params;
  const { processingConfigDiff } = req.body;

  logger.log(`Starting qc for experiment ${experimentId}`);

  const processingConfigDiffToSend = _.isEqual(processingConfigDiff, {})
    ? await new Experiment().getProcessingConfig(experimentId) : processingConfigDiff;

  await createQCPipeline(
    experimentId,
    processingConfigDiffToSend,
    req.headers.authorization,
  );

  logger.log(`Started qc for experiment ${experimentId} successfully, `);

  res.json(OK());
};

const handleResponse = async (req, res) => {
  let result;

  try {
    result = await parseSNSMessage(req, snsTopics.WORK_RESULTS);
  } catch (e) {
    logger.error('Parsing initial SNS message failed:', e);
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

      res.status(200).send('nok');
      return;
    }
  }

  res.status(200).send('ok');
};

module.exports = {
  runQC,
  handleResponse,
};
