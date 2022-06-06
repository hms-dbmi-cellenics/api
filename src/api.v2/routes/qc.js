const { runQC, handleResponse } = require('../controllers/qcController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'qc#run': [
    expressAuthorizationMiddleware,
    (req, res, next) => runQC(req, res).catch(next),
  ],
  'qc#response': (req, res, next) => {
    handleResponse(req, res).catch(next);
  },
};
