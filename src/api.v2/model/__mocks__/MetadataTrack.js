const BasicModel = require('./BasicModel')();

const stub = {
  createNewMetadataTrack: jest.fn(),
  createNewSampleValues: jest.fn(),
  patchValueForSample: jest.fn(),
  ...BasicModel,
};

const MetadataTrack = jest.fn().mockImplementation(() => stub);

module.exports = MetadataTrack;
