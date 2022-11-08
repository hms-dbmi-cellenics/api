const AWSXRay = require('aws-xray-sdk');
const config = require('../../config');
const getLogger = require('../../utils/getLogger');
const getAwsProgrammaticClientInfo = require('../helpers/cognito/getAwsProgrammaticClientInfo');

const logger = getLogger();


module.exports = {
  'programmaticInterface#getClient': async (req, res, next) => {
    logger.log('retrieving programmatic interface client'); // todo remove after debug
    try {
      const clientId = await getAwsProgrammaticClientInfo();
      const response = {
        ClientId: clientId,
        ClientRegion: config.awsRegion,
      };
      res.status(200).send(response);
    } catch (e) {
      logger.error('error processing programmatic interface get client', e);
      AWSXRay.getSegment().addError(e);
      next(e);
    }
  },
};
