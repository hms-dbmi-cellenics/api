const getLogger = require('../../utils/getLogger');
const { OK } = require('../../utils/responses');

const Plot = require('../model/Plot');

const logger = getLogger('[PlotTablesController] - ');

const getPlotConfig = async (req, res) => {
  const { experimentId, plotUuid } = req.params;
  logger.log(`Getting plot config for plot ${plotUuid}`);

  const result = await new Plot().getConfig(experimentId, plotUuid);

  logger.log(`Finished getting config for plot ${plotUuid}`);
  res.json(result);
};

const updatePlotConfig = async (req, res) => {
  const { experimentId, plotUuid } = req.params;
  const { config } = req.body;

  logger.log(`Updating config for plot ${plotUuid}`);

  await new Plot().updateConfig(experimentId, plotUuid, config);

  logger.log(`Finished updating config for plot ${plotUuid}`);

  res.send(OK());
};

module.exports = {
  getPlotConfig,
  updatePlotConfig,
};
