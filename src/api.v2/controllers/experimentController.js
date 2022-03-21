/* eslint-disable import/prefer-default-export */
const config = require('../../config');

const experiment = require('../model/experiment');
const userAccess = require('../model/userAccess');

const AccessRole = require('../../utils/enums/AccessRole');

const { OK } = require('../../utils/responses');

const getLogger = require('../../utils/getLogger');

const logger = getLogger('[ExperimentController] - ');

const getExperiment = async (req, res) => {
  const { params: { experimentId } } = req;

  const data = await experiment.getExperimentData(experimentId);

  res.json(data);
};

const createExperiment = async (req, res) => {
  const { params: { experimentId }, user, body } = req;

  const { name, description } = body;

  logger.log('Creating experiment');

  await experiment.create({ id: experimentId, name, description });

  logger.log('Setting up access permissions for experiment');
  await Promise.all([
    userAccess.create(
      { user_id: user.sub, experiment_id: experimentId, access_role: AccessRole.OWNER },
    ),
    userAccess.create(
      { user_id: config.adminSub, experiment_id: experimentId, access_role: AccessRole.OWNER },
    ),
  ]);

  logger.log('Finished creating experiment');

  res.json(OK());
};

const patchExperiment = async (req, res) => {
  const { params: { experimentId }, body } = req;

  await experiment.update(experimentId, body);

  res.json(OK());
};

module.exports = {
  getExperiment,
  createExperiment,
  patchExperiment,
};
