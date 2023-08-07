const { handleQCRequest, handleResponse } = require('../controllers/qcController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'qc#run': [
    expressAuthorizationMiddleware,
    (req, res, next) => handleQCRequest(req, res).catch(next),
  ],
  'qc#response': (req, res, next) => {
    handleResponse(req, res).catch(next);
  },
};
