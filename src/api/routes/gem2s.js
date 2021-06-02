const AWSXRay = require('aws-xray-sdk');
const { createGem2SPipeline } = require('../general-services/pipeline-manage');
const ExperimentService = require('../route-services/experiment');
const gem2sResponse = require('../route-services/gem2s-response');
const parseSNSMessage = require('../../utils/parse-sns-message');
const logger = require('../../utils/logging');

const { expressAuthorizationMiddleware } = require('../../utils/authMiddlewares');

module.exports = {
  'gem2s#create': [
    expressAuthorizationMiddleware,
    async (req, res) => {
      const data = await createGem2SPipeline(req.params.experimentId);

      const experimentService = new ExperimentService();
      await experimentService.saveGem2sHandle(req.params.experimentId, data);
      res.json(data);
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

    try {
      await gem2sResponse(io, parsedMessage);
    } catch (e) {
      logger.error(
        'Pipeline response handler failed with error: ', e,
      );

      AWSXRay.getSegment().addError(e);
      res.status(200).send('nok');
      return;
    }

    res.status(200).send('ok');
  },
};
