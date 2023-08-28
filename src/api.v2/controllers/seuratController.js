const { runSeurat, handleSeuratResponse } = require('../helpers/pipeline/seurat');
const { OK } = require('../../utils/responses');
const getLogger = require('../../utils/getLogger');
const parseSNSMessage = require('../../utils/parseSNSMessage');
const snsTopics = require('../../config/snsTopics');

const logger = getLogger('[SeuratController] - ');

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
      await handleSeuratResponse(io, parsedMessage);
    } catch (e) {
      logger.error(
        'seurat pipeline response handler failed with error: ', e,
      );

      res.status(200).send('nok');
      return;
    }
  }

  res.status(200).send('ok');
};

const handleSeuratRequest = async (req, res) => {
  const params = {
    experimentId: req.params.experimentId,
  };

  await runSeurat(params, req.headers.authorization);
  res.json(OK());
};

module.exports = {
  handleSeuratRequest,
  handleResponse,
};
