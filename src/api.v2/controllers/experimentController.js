/* eslint-disable import/prefer-default-export */
const _ = require('lodash');

const config = require('../../config');

const experiment = require('../model/experiment');
const userAccess = require('../model/userAccess');

const AccessRole = require('../../utils/enums/AccessRole');
const getLogger = require('../../utils/getLogger');
const { OK } = require('../../utils/responses');
const { NotFoundError } = require('../../utils/responses');

const logger = getLogger('[ExperimentController] - ');

const getExperiment = async (req, res) => {
  const { params: { experimentId } } = req;

  const data = await experiment.getExperimentData(experimentId);

  if (_.isNil(data)) {
    throw new NotFoundError('Experiment not found');
  }

  res.json(data);
};

const createExperiment = async (req, res) => {
  const { params: { experimentId }, user, body } = req;

  const { name, description } = body;

  logger.log('Creating experiment');

  const result = await experiment.create({ id: experimentId, name, description });

  logger.log('Setting up access permissions for experiment');
  await Promise.all([
    userAccess.create(
      { user_id: user.sub, experiment_id: experimentId, access_role: AccessRole.OWNER },
    ),
    userAccess.create(
      { user_id: config.adminSub, experiment_id: experimentId, access_role: AccessRole.OWNER },
    ),
  ]);

  logger.log(`Finished creating experiment ${result.id}`);

  res.json(OK());
};

const patchExperiment = async (req, res) => {
  const { params: { experimentId }, body } = req;

  logger.log(`Updating experiment ${experimentId}`);

  const snakeCasedKeysToPatch = _.mapKeys(body, (_value, key) => _.snakeCase(key));

  await experiment.update(experimentId, snakeCasedKeysToPatch);

  logger.log(`Finished updating experiment ${experimentId}`);

  res.json(OK());
};

const updateSamplePosition = async (req, res) => {
  const {
    params: { experimentId },
    body: { newPosition, oldPosition },
  } = req;

  logger.log(`Reordering sample in ${experimentId} from position ${oldPosition} to ${newPosition}`);

  if (oldPosition === newPosition) {
    logger.log('Skipping reordering, oldPosition === newPosition');
    res.json(OK());
  }

  await experiment.updateSamplePosition(experimentId, oldPosition, newPosition);

  logger.log(`Finished reordering samples in ${experimentId}`);

  res.json(OK());
};

module.exports = {
  getExperiment,
  createExperiment,
  patchExperiment,
  updateSamplePosition,
};
