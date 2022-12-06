const BasicModel = require('./BasicModel')();

const stub = {
  getAllExperiments: jest.fn(),
  getExperimentData: jest.fn(),
  updateSamplePosition: jest.fn(),
  updateProcessingConfig: jest.fn(),
  getProcessingConfig: jest.fn(),
  getResourceRequirements: () => ({}),
  createCopy: jest.fn(),
  addSamples: jest.fn(),
  deleteSample: jest.fn(),
  getDownloadLink: jest.fn(),
  getExampleExperiments: jest.fn(),
  ...BasicModel,
};

const Experiment = jest.fn().mockImplementation(() => stub);

module.exports = Experiment;
