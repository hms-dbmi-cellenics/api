const BasicModel = require('./BasicModel')();

const stub = {
  ...BasicModel,
};

const ExperimentExecution = jest.fn().mockImplementation(() => stub);

module.exports = ExperimentExecution;
