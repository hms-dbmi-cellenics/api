const BasicModel = require('./BasicModel')();

const stub = {
  ...BasicModel,
  isChild: jest.fn(),
};

const ExperimentParent = jest.fn().mockImplementation(() => stub);

module.exports = ExperimentParent;
