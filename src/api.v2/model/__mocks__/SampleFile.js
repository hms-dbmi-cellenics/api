const BasicModel = require('./BasicModel')();

const stub = {
  updateUploadStatus: jest.fn(),
  allFilesForSample: jest.fn(),
  ...BasicModel,
};

const Sample = jest.fn().mockImplementation(() => stub);

module.exports = Sample;
