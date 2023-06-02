const BasicModel = require('./BasicModel')();

const stub = {
  createCopy: jest.fn(),
  ...BasicModel,
};

const ExperimentExecution = jest.fn().mockImplementation(() => stub);

module.exports = ExperimentExecution;
