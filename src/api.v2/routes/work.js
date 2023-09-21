const { submitWork } = require('../controllers/workController');
const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'work#submitRequest': [
    expressAuthorizationMiddleware,
    (req, res, next) => submitWork(req, res).catch(next),
  ],
};
