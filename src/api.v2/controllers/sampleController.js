const _ = require('lodash');

const Sample = require('../model/Sample');
const Experiment = require('../model/Experiment');
const MetadataTrack = require('../model/MetadataTrack');

const getLogger = require('../../utils/getLogger');
const { OK } = require('../../utils/responses');

const sqlClient = require('../../sql/sqlClient');

const logger = getLogger('[SampleController] - ');

const createSample = async (req, res) => {
  const {
    params: { experimentId, sampleId },
    body: { name, sampleTechnology },
  } = req;

  logger.log('Creating sample');

  await sqlClient.get().transaction(async (trx) => {
    await new Sample(trx).create({
      id: sampleId,
      experiment_id: experimentId,
      name,
      sample_technology: sampleTechnology,
    });

    await new Experiment(trx).addSample(experimentId, sampleId);

    await new MetadataTrack(trx).createNewSampleValues(experimentId, sampleId);
  });

  logger.log(`Finished creating sample ${sampleId} for experiment ${experimentId}`);

  res.json(OK());
};

const patchSample = async (req, res) => {
  const { params: { experimentId, sampleId }, body } = req;

  logger.log(`Patching sample ${sampleId} in experiment ${experimentId}`);

  const snakeCasedKeysToPatch = _.mapKeys(body, (_value, key) => _.snakeCase(key));

  await new Sample().updateById(sampleId, snakeCasedKeysToPatch);

  logger.log(`Finished patching sample ${sampleId} in experiment ${experimentId}`);

  res.json(OK());
};

const deleteSample = async (req, res) => {
  const { params: { experimentId, sampleId } } = req;

  logger.log(`Deleting sample ${sampleId} from experiment ${experimentId}`);

  await sqlClient.get().transaction(async (trx) => {
    await new Sample(trx).destroy(sampleId);
    await new Experiment(trx).deleteSample(experimentId, sampleId);
  });

  logger.log(`Finished deleting sample ${sampleId} from experiment ${experimentId}`);

  res.json(OK());
};

module.exports = {
  createSample,
  patchSample,
  deleteSample,
};
