const _ = require('lodash');

const Sample = require('../model/Sample');
const Experiment = require('../model/Experiment');
const MetadataTrack = require('../model/MetadataTrack');

const getLogger = require('../../utils/getLogger');
const { OK } = require('../../utils/responses');

const sqlClient = require('../../sql/sqlClient');

const logger = getLogger('[SampleController] - ');

const createSamples = async (req, res) => {
  const {
    params: { experimentId },
    body: samples,
  } = req;
  logger.log('Creating sample');


  await sqlClient.get().transaction(async (trx) => {
    const sampleModel = new Sample(trx);

    await Promise.all(samples.map(({
      id, name, sampleTechnology, options,
    }) => sampleModel.create({
      id,
      experiment_id: experimentId,
      name,
      sample_technology: sampleTechnology,
      options,
    })));


    const sampleIds = samples.map(({ id }) => id);

    await new Experiment(trx).addSamples(experimentId, sampleIds);
    await new MetadataTrack(trx).createNewSamplesValues(experimentId, sampleIds);
  });

  logger.log(`Finished creating samples ${JSON.stringify(samples.map(({ id }) => id))} for experiment ${experimentId}`);
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

const updateSamplesOptions = async (req, res) => {
  const { params: { experimentId }, body } = req;

  logger.log(`Updating options for samples in experiment ${experimentId}`);

  await new Sample().updateOption(experimentId, body);

  logger.log(`Finished updating options for samples in experiment ${experimentId}`);
  res.json(OK());
};

const deleteSample = async (req, res) => {
  const { params: { experimentId, sampleId } } = req;
  logger.log(`Deleting sample ${sampleId} from experiment ${experimentId}`);

  await sqlClient.get().transaction(async (trx) => {
    await new Sample(trx).deleteById(sampleId);
    await new Experiment(trx).deleteSample(experimentId, sampleId);
  });

  logger.log(`Finished deleting sample ${sampleId} from experiment ${experimentId}`);
  res.json(OK());
};

const getSamples = async (req, res) => {
  const { params: { experimentId } } = req;

  logger.log(`Getting samples for experiment ${experimentId}`);

  const samples = await new Sample().getSamples(experimentId);

  logger.log(`Finished getting samples for experiment ${experimentId}`);

  res.json(samples);
};

module.exports = {
  createSamples,
  patchSample,
  updateSamplesOptions,
  getSamples,
  deleteSample,
};
