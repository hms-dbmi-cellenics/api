const ExperimentService = require('../api/route-services/experiment');


const authorizeRequest = async (experimentId, userId) => {
  const experiment = new ExperimentService();
  const data = await experiment.getExperimentPermissions(experimentId);
  if (data.can_write.includes(userId)) {
    return true;
  }
  return false;
};

module.exports = authorizeRequest;
