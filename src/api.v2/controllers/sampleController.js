const Sample = require('../model/Sample');
const Experiment = require('../model/Experiment');

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
    });
  } catch (e) {
    logger.log(`Error creating sample ${sampleId} for experiment ${experimentId}`);

    throw e;
  }

  logger.log(`Finished creating sample ${sampleId} for experiment ${experimentId}`);

  res.json(OK());
};

// const deleteSample = async (req, res) => {
//   const { params: { experimentId, sampleId } } = req;


//   const trx = await sqlClient.get().transaction();

//   await new Sample(trx).destroy();
//   await new Experiment(trx).removeSample();
// };

module.exports = {
  createSample,
};
