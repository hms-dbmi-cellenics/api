/* eslint-disable import/prefer-default-export */
const _ = require('lodash');

const experiment = require('../model/experiment');
const userAccess = require('../model/userAccess');

const getLogger = require('../../utils/getLogger');
const { OK } = require('../../utils/responses');

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
  await userAccess.createNewExperimentPermissions(user.sub, experimentId);

  logger.log(`Finished creating experiment ${experimentId}`);

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

    return;
  }

  await experiment.updateSamplePosition(experimentId, oldPosition, newPosition);

  logger.log(`Finished reordering samples in ${experimentId}`);

  res.json(OK());
};

const getProcessingConfig = async (req, res) => {
  const { params: { experimentId } } = req;
  logger.log('Getting processing config for experiment ', experimentId);

  const result = await experiment.getProcessingConfig(experimentId);
  res.json(result);
};

const updateProcessingConfig = async (req, res) => {
  const { params: { experimentId }, body } = req;
  logger.log('Updating processing config for experiment ', experimentId, 'name ', body);

  await experiment.updateProcessingConfig(experimentId, body);
  res.json(OK());
};

module.exports = {
  getExperiment,
  createExperiment,
  updateProcessingConfig,
  patchExperiment,
  updateSamplePosition,
  getProcessingConfig,
};
