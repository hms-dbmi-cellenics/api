// const getUserRoles = require('../helpers/access/getUserRoles');
const Gem2sService = require('../helpers/pipeline/gem2s/Gem2sService');
const getLogger = require('../../utils/getLogger');

const logger = getLogger('[AccessController] - ');

const runGem2s = async (req, res) => {
  const { experimentId } = req.params;

  logger.log(`Running gem2s for experiment ${experimentId}`);
  // const users = await getUserRoles(experimentId);
  // const { experimentId } = req.params;

  const newExecution = Gem2sService.gem2sCreate(experimentId, req.body, req.headers.authorization);

  // logger.log(`S for experiment ${experimentId}`);
  res.json(newExecution);
};

module.exports = {
  runGem2s,
};
