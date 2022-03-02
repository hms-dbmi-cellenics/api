const AccessService = require('../route-services/access/index');
const { expressAuthorizationMiddleware } = require('../../utils/authMiddlewares');

const accessService = new AccessService();
module.exports = {
  'access#addRole': [
    expressAuthorizationMiddleware,
    async (req, res, next) => {
      const { experimentId } = req.params;
      const {
        userEmail, projectUuid, role,
      } = req.body;

      accessService.inviteUser(userEmail, experimentId, projectUuid, role, req.user)
        .then((data) => res.json(data))
        .catch(next);
    },
  ],
  'access#getRoles': [
    expressAuthorizationMiddleware,
    async (req, res, next) => {
      const { experimentId } = req.params;
      accessService.getRoles(experimentId)
        .then((data) => res.json(data))
        .catch(next);
    },
  ],
};
