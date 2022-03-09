/* eslint-disable import/prefer-default-export */
const config = require('../../config');

const experiment = require('../model/experiment');
const userAccess = require('../model/userAccess');

const AccessRole = require('../../utils/enums/AccessRole');

const { OK } = require('../../utils/responses');

const createExperiment = async (req, res) => {
  const { params: { experimentId }, user, body } = req;

  const { name, description } = body;

  await experiment.create({ id: experimentId, name, description });

  await Promise.all([
    userAccess.create(
      { user_id: user.sub, experiment_id: experimentId, access_role: AccessRole.OWNER },
    ),
    userAccess.create(
      { user_id: config.adminArn, experiment_id: experimentId, access_role: AccessRole.OWNER },
    ),
  ]);

  res.json(OK());
};

module.exports = {
  createExperiment,
};
