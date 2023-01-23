const BasicModel = require('./BasicModel')();

const stub = {
  ...BasicModel,
};

const ExperimentParent = jest.fn().mockImplementation(() => stub);

module.exports = ExperimentParent;
