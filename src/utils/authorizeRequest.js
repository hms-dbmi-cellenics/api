const ExperimentService = require('../api/route-services/experiment');


const authorizeRequest = async (experimentId) => {
  const experiment = new ExperimentService();

  const data = await experiment.getExperimentData(experimentId);
  console.log('WEE NEED THIS LOL ', data);
};

module.exports = authorizeRequest;
