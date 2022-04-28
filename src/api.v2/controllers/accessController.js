const getUserRoles = require('../helpers/access/getUserRoles');
const getLogger = require('../../utils/getLogger');

const logger = getLogger('[AccessController] - ');

const getExperimentUsers = async (req, res) => {
  const { experimentId } = req.params;

  logger.log(`Fetching users for experiment ${experimentId}`);
  const users = await getUserRoles(experimentId);

  logger.log(`Users fetched for experiment ${experimentId}`);

  res.json(users);
};

module.exports = {
  getExperimentUsers,
};
