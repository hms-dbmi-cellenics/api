const Sample = require('../model/Sample');
const Experiment = require('../model/Experiment');
const MetadataTrack = require('../model/MetadataTrack');

const getLogger = require('../../utils/getLogger');
const { OK } = require('../../utils/responses');

const sqlClient = require('../../sql/sqlClient');

const logger = getLogger('[SampleController] - ');

const createSample = async (req, res) => {
  const { params: { experimentId, sampleId }, body } = req;

  const { name, sampleTechnology } = body;

  logger.log('Creating sample');

  try {
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
  } catch (e) {
    logger.log(`Error creating sample ${sampleId} for experiment ${experimentId}`);
    throw e;
  }

  logger.log(`Finished creating sample ${sampleId} for experiment ${experimentId}`);

  res.json(OK());
};

const deleteSample = async (req, res) => {
  const { params: { experimentId, sampleId } } = req;

  await sqlClient.get().transaction(async (trx) => {
    await new Sample(trx).destroy(sampleId);
    await new Experiment(trx).deleteSample(experimentId, sampleId);
  });

  logger.log(`Finished deleting sample ${sampleId} from experiment ${experimentId}`);

  res.json(OK());
};

module.exports = {
  createSample,
  deleteSample,
};
