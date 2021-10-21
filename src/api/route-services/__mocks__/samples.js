const { OK } = require('../../../utils/responses');

const mockSamples = {
  'sample-1': {
    name: 'sample-1',
    projectUuid: 'project-1',
    uuid: 'sample-1',
    type: '10X Chromium',
    species: 'hsapies',
    createdDate: '2020-01-01T00:00:00.000Z',
    lastModified: null,
    complete: true,
    error: false,
    fileNames: ['test-1'],
    files: {
      'file-1': {
        name: 'file-1',
      },
    },
  },
};

const mockGetSamples = jest.fn(() => (
  new Promise((resolve) => {
    resolve(mockSamples);
  })
));

const mockGetSamplesByExperimentId = jest.fn(() => (
  new Promise((resolve) => resolve(mockSamples))
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

const mockGetS3UploadUrl = jest.fn(() => (
  new Promise((resolve) => {
    resolve({ data: { message: 'sucess', code: 200 } });
  })
));

const mock = jest.fn().mockImplementation(() => ({
  getSamples: mockGetSamples,
  getSamplesByExperimentId: mockGetSamplesByExperimentId,
  updateSamples: mockUpdateSamples,
  deleteSamplesEntry: mockDeleteSamples,
  addSample: mockAddSample,
  removeSamples: mockRemoveSamples,
  getS3UploadUrl: mockGetS3UploadUrl,
}));

module.exports = mock;
