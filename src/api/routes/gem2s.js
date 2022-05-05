const AWSXRay = require('aws-xray-sdk');
const Gem2sService = require('../route-services/gem2s');
const parseSNSMessage = require('../../utils/parse-sns-message');
const getLogger = require('../../utils/getLogger');

const { expressAuthorizationMiddleware } = require('../../utils/authMiddlewares');
const { handleResponse: handleResponseApiV2 } = require('../../api.v2/controllers/gem2sController');

const logger = getLogger();

module.exports = {
  'gem2s#create': [
    expressAuthorizationMiddleware,
    async (req, res, next) => {
      const { experimentId } = req.params;

      Gem2sService.gem2sCreate(experimentId, req.body, req.headers.authorization)
        .then((response) => res.json(response))
        .catch(next);
    },
  ],

  'gem2s#response': async (req, res) => {
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

    // Temporary until we have sns v2 topic
    if (parsedMessage.input.apiVersion === 'v2') {
      handleResponseApiV2(req, res);
      return;
    }

    const isSnsNotification = parsedMessage !== undefined;
    if (isSnsNotification) {
      try {
        await Gem2sService.gem2sResponse(io, parsedMessage);
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
  },
};
