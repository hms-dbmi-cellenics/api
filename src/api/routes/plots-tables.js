const PlotsTablesService = require('../route-services/plots-tables');

const plotsTablesService = new PlotsTablesService();

module.exports = {
  'plots-tables#create': (req, res, next) => {
    const { experimentId, plotUuid } = req.params;

    plotsTablesService.create(experimentId, plotUuid, req.body)
      .then((response) => res.json(response))
      .catch(next);
  },
  'plots-tables#read': (req, res, next) => {
    const { experimentId, plotUuid } = req.params;

    plotsTablesService.read(experimentId, plotUuid)
      .then((response) => res.json(response))
      .catch((e) => {
        if (e.message.includes('not found')) {
          res.status(404).send('');
        } else {
          throw e;
        }
      })
      .catch(next);
  },
  'plots-tables#update': (req, res, next) => {
    const { experimentId, plotUuid } = req.params;

    plotsTablesService.create(experimentId, plotUuid, req.body)
      .then((response) => res.json(response))
      .catch(next);
  },
  'plots-tables#delete': (req, res, next) => {
    const { experimentId, plotUuid } = req.params;

    plotsTablesService.delete(experimentId, plotUuid)
      .then((response) => res.json(response))
      .catch(next);
  },
};
