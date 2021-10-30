// const AWSXRay = require('aws-xray-sdk');
// const Gem2sService = require('../route-services/gem2s');
// const parseSNSMessage = require('../../utils/parse-sns-message');
const getLogger = require('../../utils/getLogger');

// const { expressAuthorizationMiddleware } = require('../../utils/authMiddlewares');

const logger = getLogger();

module.exports = {
  'kubernetes#event': [
    // expressAuthorizationMiddleware,
    async (req) => {
      logger.log('Received kubernetes event');
      // logger.log(req);
      // logger.log(res);
      // logger.log(next);
      logger.log('========================');
      logger.log(req.body);
      // const { experimentId } = req.params;

      // Gem2sService.gem2sCreate(experimentId, req.body, req.headers.authorization)
      //   .then((response) => res.json(response))
      //   .catch(next);
    },
  ],
};
