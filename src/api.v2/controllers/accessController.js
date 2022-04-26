const UserAccess = require('../model/UserAccess');
const getLogger = require('../../utils/getLogger');

const logger = getLogger('[AccessController] - ');

const getExperimentUsers = async (req, res) => {
  const { experimentId } = req.params;

  logger.log(`Fetching users for experiment ${experimentId}`);
  const data = await new UserAccess().getExperimentUsers(experimentId);

  logger.log(`Users fetched for experiment ${experimentId}`);

  res.json(data);
};

module.exports = {
  getExperimentUsers,
};
