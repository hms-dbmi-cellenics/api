const AWSXRay = require('aws-xray-sdk');
const getLogger = require('../../utils/getLogger');
const getAwsProgrammaticClientInfo = require('../helpers/cognito/getAwsProgrammaticClientInfo');
const { InternalServerError } = require('../../utils/responses');

const logger = getLogger();


module.exports = {
  'programmaticInterface#getClient': async (req, res, next) => {
    logger.log('retrieving programmatic interface client'); // todo remove after debug
    try {
      const clientInfo = await getAwsProgrammaticClientInfo();
      res.status(200).send(clientInfo);
    } catch (e) {
      const err = new InternalServerError(`programmaticInterface#getClient: ${e}`);
      logger.error(err);
      AWSXRay.getSegment().addError(err);
      next(err);
    }
  },
};
