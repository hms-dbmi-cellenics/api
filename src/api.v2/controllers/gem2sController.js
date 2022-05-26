const AWSXRay = require('aws-xray-sdk');

const { gem2sCreate, gem2sResponse } = require('../helpers/pipeline/gem2s');
const { OK } = require('../../utils/responses');
const getLogger = require('../../utils/getLogger');
const parseSNSMessage = require('../../utils/parse-sns-message');

const logger = getLogger('[Gem2sController] - ');

const runGem2s = async (req, res) => {
  const { experimentId } = req.params;

  logger.log(`Starting gem2s for experiment ${experimentId}`);

  const newExecution = await gem2sCreate(experimentId, req.body, req.headers.authorization);

  logger.log(`Started gem2s for experiment ${experimentId} successfully, `);
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
      await gem2sResponse(io, parsedMessage);
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

module.exports = {
  runGem2s,
  handleResponse,
};
