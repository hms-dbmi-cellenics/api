const _ = require('lodash');

const Experiment = require('../model/Experiment');
const UserAccess = require('../model/UserAccess');

const getLogger = require('../../utils/getLogger');
const { OK } = require('../../utils/responses');
const sqlClient = require('../../sql/sqlClient');

const constants = require('../helpers/pipeline/constants');
const getPipelineStatus = require('../helpers/pipeline/getPipelineStatus');
const getWorkerStatus = require('../helpers/worker/getWorkerStatus');

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

  await new Experiment().updateById(experimentId, snakeCasedKeysToPatch);

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

const getProcessingConfig = async (req, res) => {
  const { params: { experimentId } } = req;
  logger.log('Getting processing config for experiment ', experimentId);

  const result = await new Experiment().getProcessingConfig(experimentId);
  res.json(result);
};

const updateProcessingConfig = async (req, res) => {
  const { params: { experimentId }, body } = req;
  logger.log('Updating processing config for experiment ', experimentId);

  await new Experiment().updateProcessingConfig(experimentId, body);
  res.json(OK());
};

const getBackendStatus = async (req, res) => {
  const { experimentId } = req.params;

  logger.log(`Getting backend status for experiment ${experimentId}`);

  const [{ gem2s }, { qc }, { worker }] = await Promise.all(
    [
      getPipelineStatus(experimentId, constants.GEM2S_PROCESS_NAME),
      getPipelineStatus(experimentId, constants.QC_PROCESS_NAME),
      getWorkerStatus(experimentId),
    ],
  );

  const formattedResponse = {
    [constants.OLD_QC_NAME_TO_BE_REMOVED]: qc,
    gem2s,
    worker,
  };

  logger.log(`Got backend status for experiment ${experimentId} successfully`);

  res.json(formattedResponse);
};

module.exports = {
  getAllExperiments,
  getExperiment,
  createExperiment,
  updateProcessingConfig,
  patchExperiment,
  updateSamplePosition,
  getProcessingConfig,
  getBackendStatus,
};
