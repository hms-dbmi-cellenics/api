const PlotsTablesService = require('../route-services/plots-tables');
const { NotFoundError } = require('../../utils/responses');

const { expressAuthorizationMiddleware } = require('../../utils/authMiddlewares');


const plotsTablesService = new PlotsTablesService();

module.exports = {
  'plots-tables#read': [
    expressAuthorizationMiddleware,
    (req, res, next) => {
      const { experimentId, plotUuid } = req.params;
      plotsTablesService.read(experimentId, plotUuid)
        .then((response) => res.json(response))
        .catch((e) => {
          if (e.message.includes('not found')) {
            throw (new NotFoundError('Plot not found'));
          } else {
            throw e;
          }
        })
        .catch(next);
    },
  ],
  'plots-tables#update': [
    expressAuthorizationMiddleware,
    (req, res, next) => {
      const { experimentId, plotUuid } = req.params;
      plotsTablesService.create(experimentId, plotUuid, req.body)
        .then((response) => res.json(response))
        .catch(next);
    },
  ],
};
