const { OK } = require('../../../utils/responses');

const mockCreateExperiment = jest.fn((req, res) => {
  res.json(OK());
});

module.exports = {
  createExperiment: mockCreateExperiment,
};
