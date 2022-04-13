const BasicModel = require('./BasicModel')();

const stub = {
  createNewSampleValues: jest.fn(),
  ...BasicModel,
};

const MetadataTrack = jest.fn().mockImplementation(() => stub);

module.exports = MetadataTrack;
