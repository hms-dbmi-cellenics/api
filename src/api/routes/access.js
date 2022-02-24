const AccessService = require('../route-services/access/index');

const accessService = new AccessService();
module.exports = {
  'access#addRole': [
    async (req, res, next) => {
      const {
        experimentId, userEmail, projectId, role,
      } = req.body;
      accessService.inviteUser(userEmail, experimentId, projectId, role)
        .then((data) => res.json(data))
        .catch(next);
    },
  ],
};
