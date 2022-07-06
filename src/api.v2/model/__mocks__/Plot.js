const BasicModel = require('./BasicModel')();

const stub = {
  getConfig: jest.fn(),
  updateConfig: jest.fn(),
  ...BasicModel,
};

const Plot = jest.fn().mockImplementation(() => stub);

module.exports = Plot;
