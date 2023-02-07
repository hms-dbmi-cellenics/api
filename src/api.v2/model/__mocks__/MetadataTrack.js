const BasicModel = require('./BasicModel')();

const stub = {
  createNewMetadataTrack: jest.fn(),
  createNewSamplesValues: jest.fn(),
  patchValueForSample: jest.fn(),
  bulkUpdateMetadata: jest.fn(),

  ...BasicModel,
};

const MetadataTrack = jest.fn().mockImplementation(() => stub);

module.exports = MetadataTrack;
