const {
  // getExperimentDetails,
  createExperiment,
} = require('../controllers/experimentController');

module.exports = {
  'experiment#createExperiment': [
    (req, res, next) => createExperiment(req, res).catch(next),
  ],
};
