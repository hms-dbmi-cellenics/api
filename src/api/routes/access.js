const AccessService = require('../route-services/access/index');
const { authenticationMiddlewareSocketIO, expressAuthenticationOnlyMiddleware } = require('../../utils/authMiddlewares');

const accessService = new AccessService();
module.exports = {
  'access#addRole': [expressAuthenticationOnlyMiddleware,
    async (req, res, next) => {
      const {
        experimentId, userEmail, projectId, role,
      } = req.body;

      const inviterUser = await authenticationMiddlewareSocketIO(req.headers.authorization);

      accessService.inviteUser(userEmail, experimentId, projectId, role, inviterUser)
        .then((data) => res.json(data))
        .catch(next);
    },
  ],
};
