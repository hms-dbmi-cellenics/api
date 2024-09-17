const { runObj2s, handleObj2sResponse } = require('../helpers/pipeline/obj2s');
const { OK } = require('../../utils/responses');
const getLogger = require('../../utils/getLogger');
const parseSNSMessage = require('../../utils/parseSNSMessage');
const snsTopics = require('../../config/snsTopics');

const logger = getLogger('[Obj2sController] - ');

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
      await handleObj2sResponse(io, parsedMessage);
    } catch (e) {
      logger.error(
        'obj2s pipeline response handler failed with error: ', e,
      );

      res.status(200).send('nok');
      return;
    }
  }

  res.status(200).send('ok');
};

const handleObj2sRequest = async (req, res) => {
  const params = {
    experimentId: req.params.experimentId,
  };

  await runObj2s(params, req.headers.authorization);
  res.json(OK());
};

module.exports = {
  handleObj2sRequest,
  handleResponse,
};
