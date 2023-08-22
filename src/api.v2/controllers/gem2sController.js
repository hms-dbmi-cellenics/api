const AWSXRay = require('aws-xray-sdk');

const { runGem2s, handleGem2sResponse } = require('../helpers/pipeline/gem2s');
const { OK } = require('../../utils/responses');
const getLogger = require('../../utils/getLogger');
const parseSNSMessage = require('../../utils/parseSNSMessage');
const snsTopics = require('../../config/snsTopics');

const logger = getLogger('[Gem2sController] - ');

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
  const params = { experimentId: req.params.experimentId };

  await runGem2s(params, req.headers.authorization);

  res.json(OK());
};

module.exports = {
  handleGem2sRequest,
  handleResponse,
};
