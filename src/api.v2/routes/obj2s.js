const { handleObj2sRequest, handleResponse } = require('../controllers/obj2sController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'obj2s#run': [
    expressAuthorizationMiddleware,
    (req, res, next) => handleObj2sRequest(req, res).catch(next),
  ],
  'obj2s#response': (req, res, next) => {
    handleResponse(req, res).catch(next);
  },
};
