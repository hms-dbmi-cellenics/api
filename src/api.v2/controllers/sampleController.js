const sample = require('../model/sample');

const getLogger = require('../../utils/getLogger');
const { OK } = require('../../utils/responses');

const logger = getLogger('[SampleController] - ');

const createSample = async (req, res) => {
  const { params: { experimentId, sampleId }, body } = req;

  const { name, sampleTechnology } = body;

  logger.log('Creating sample');

  await sample.create({
    id: sampleId,
    experiment_id: experimentId,
    name,
    sample_technology: sampleTechnology,
  });

  logger.log(`Finished creating sample ${sampleId} for experiment ${experimentId}`);

  res.json(OK());
};

module.exports = {
  createSample,
};
