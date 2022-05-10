const {
  getUserAccess,
  inviteUser,
  revokeAccess,
  postRegistration,
} = require('../controllers/accessController');

const { expressAuthorizationMiddleware } = require('../middlewares/authMiddlewares');

module.exports = {
  'access#getExperimentUsers': [
    expressAuthorizationMiddleware,
    (req, res, next) => getUserAccess(req, res).catch(next),
  ],
  'access#inviteUser': [
    expressAuthorizationMiddleware,
    (req, res, next) => inviteUser(req, res).catch(next),
  ],
  'access#revokeAccess': [
    expressAuthorizationMiddleware,
    (req, res, next) => revokeAccess(req, res).catch(next),
  ],
  'access#postRegister': [
    expressAuthorizationMiddleware,
    (req, res, next) => postRegistration(req, res).catch(next),
  ],
};
