const _ = require('lodash');

const Experiment = require('../model/Experiment');
const UserAccess = require('../model/UserAccess');

const getLogger = require('../../utils/getLogger');
const { OK } = require('../../utils/responses');
const sqlClient = require('../../sql/sqlClient');

const logger = getLogger('[ExperimentController] - ');

const getAllExperiments = async (req, res) => {
  const { user: { sub: userId } } = req;

  const data = await new Experiment().getAllExperiments(userId);

  res.json(data);
};

const getExperiment = async (req, res) => {
  const { params: { experimentId } } = req;

  logger.log(`Getting experiment ${experimentId}`);

  const data = await new Experiment().getExperimentData(experimentId);

  logger.log(`Finished getting experiment ${experimentId}`);

  res.json(data);
};

const createExperiment = async (req, res) => {
  const { params: { experimentId }, user, body } = req;

  const { name, description } = body;

  logger.log('Creating experiment');

  await sqlClient.get().transaction(async (trx) => {
    await new Experiment(trx).create({ id: experimentId, name, description });
    await new UserAccess(trx).createNewExperimentPermissions(user.sub, experimentId);
  });

  logger.log(`Finished creating experiment ${experimentId}`);

  res.json(OK());
};

const patchExperiment = async (req, res) => {
  const { params: { experimentId }, body } = req;

  logger.log(`Patching experiment ${experimentId}`);

  const snakeCasedKeysToPatch = _.mapKeys(body, (_value, key) => _.snakeCase(key));

  await new Experiment().update(experimentId, snakeCasedKeysToPatch);

  logger.log(`Finished patching experiment ${experimentId}`);

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

  await new Experiment().updateSamplePosition(experimentId, oldPosition, newPosition);

  logger.log(`Finished reordering samples in ${experimentId}`);

  res.json(OK());
};

module.exports = {
  getAllExperiments,
  getExperiment,
  createExperiment,
  patchExperiment,
  updateSamplePosition,
};
