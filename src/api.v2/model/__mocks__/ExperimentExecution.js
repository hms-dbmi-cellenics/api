const BasicModel = require('./BasicModel')();

const stub = {
  copyTo: jest.fn(),
  updateExecution: jest.fn(),
  ...BasicModel,
};

const ExperimentExecution = jest.fn().mockImplementation(() => stub);

module.exports = ExperimentExecution;
