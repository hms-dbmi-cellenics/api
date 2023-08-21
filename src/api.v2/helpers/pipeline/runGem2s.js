const getLogger = require('../../../utils/getLogger');

const { MethodNotAllowedError } = require('../../../utils/responses');
const ExperimentParent = require('../../model/ExperimentParent');
const { startGem2sPipeline } = require('./gem2s');

const logger = getLogger('[Gem2sService] - ');

const runGem2s = async (params, authorization) => {
  const { experimentId } = params;

  logger.log(`Starting gem2s for experiment ${experimentId}`);
  logger.log(ExperimentParent);
  const { parentExperimentId = null } = await new ExperimentParent()
    .find({ experiment_id: experimentId })
    .first();
  if (parentExperimentId) {
    throw new MethodNotAllowedError(`Experiment ${experimentId} can't run gem2s`);
  }

  const newExecution = await startGem2sPipeline(params, authorization);

  logger.log(`Started gem2s for experiment ${experimentId} successfully, `);
  logger.log('New executions data:');
  logger.log(JSON.stringify(newExecution));
};

module.exports = {
  runGem2s,
};
