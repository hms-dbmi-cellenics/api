const BasicModel = require('./BasicModel')();

const stub = {
  getConfig: jest.fn(),
  updateConfig: jest.fn(),
  invalidateAttributesForMatches: jest.fn(),
  copyTo: jest.fn(),
  ...BasicModel,
};

const Plot = jest.fn().mockImplementation(() => stub);

module.exports = Plot;
