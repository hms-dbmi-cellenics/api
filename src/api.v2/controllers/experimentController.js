/* eslint-disable import/prefer-default-export */
const experiment = require('../model/experiment');

const { OK } = require('../../utils/responses');

const createExperiment = async (req, res) => {
  const { params: { experimentId }, body } = req;

  const { name, description } = body;

  await experiment.create({ id: experimentId, name, description });

  res.json(OK());
};

module.exports = {
  createExperiment,
};
