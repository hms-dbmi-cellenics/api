const { OK } = require('../../../utils/responses');
const MockDataFactory = require('./MockDataFactory');

const mockGetSamples = jest.fn((projectUuid) => (
  new Promise((resolve) => {
    const dataFactory = new MockDataFactory({ projectId: projectUuid });

    resolve(dataFactory.getSamplesEntry());
  })
));

const mockGetSamplesByExperimentId = jest.fn((experimentId) => (
  new Promise((resolve) => {
    const dataFactory = new MockDataFactory({ experimentId });
    return resolve(dataFactory.getSamplesEntry());
  })
));

const mockUpdateSamples = jest.fn(() => new Promise((resolve) => {
  resolve({ data: { message: 'sucess', code: 200 } });
}));

const mockDeleteSamples = jest.fn(() => (
  new Promise((resolve) => {
    resolve(OK());
  })
));

const mockAddSample = jest.fn(() => (
  new Promise((resolve) => {
    resolve({ data: { message: 'sucess', code: 200 } });
  })
));

const mockRemoveSamples = jest.fn(() => (
  new Promise((resolve) => {
    resolve({ data: { message: 'sucess', code: 200 } });
  })
));

const mockGetS3UploadUrl = jest.fn(() => 'mockedS3UploadUrl');
const mockGetS3DownloadUrl = jest.fn(() => 'mockedS3DownloadUrl');

const mock = jest.fn().mockImplementation(() => ({
  getSamples: mockGetSamples,
  getSamplesByExperimentId: mockGetSamplesByExperimentId,
  updateSamples: mockUpdateSamples,
  deleteSamplesEntry: mockDeleteSamples,
  addSample: mockAddSample,
  removeSamples: mockRemoveSamples, // Missing tests
  getS3UploadUrl: mockGetS3UploadUrl,
  getS3DownloadUrl: mockGetS3DownloadUrl,
}));

module.exports = mock;
