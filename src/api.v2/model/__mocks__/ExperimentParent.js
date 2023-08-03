const BasicModel = require('./BasicModel')();

const stub = {
  ...BasicModel,
  isSubset: jest.fn(),
  copyTo: jest.fn(),
};

const ExperimentParent = jest.fn().mockImplementation(() => stub);

module.exports = ExperimentParent;
