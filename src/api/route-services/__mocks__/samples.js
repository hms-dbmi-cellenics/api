const { OK } = require('../../../utils/responses');

const filesObject = {
  lastModified: '2021-10-22T12:39:41.117Z',
  'matrix.mtx.gz': {
    valid: true,
    path: '9b5d23ef-b447-4239-8e17-714aa9a4d06e/matrix.mtx.gz',
    upload: {},
    name: 'matrix.mtx.gz',
    compressed: true,
    lastModified: '2021-10-22T12:39:41.033Z',
    bundle: {
      path: '/WT1/matrix.mtx.gz',
    },
    errors: '',
  },
  'features.tsv.gz': {
    valid: true,
    path: '9b5d23ef-b447-4239-8e17-714aa9a4d06e/matrix.mtx.gz',
    upload: {},
    name: 'matrix.mtx.gz',
    compressed: true,
    lastModified: '2021-10-22T12:39:41.033Z',
    bundle: {
      path: '/WT1/matrix.mtx.gz',
    },
    errors: '',
  },
  'barcodes.tsv.gz': {
    valid: true,
    path: '9b5d23ef-b447-4239-8e17-714aa9a4d06e/matrix.mtx.gz',
    upload: {},
    name: 'matrix.mtx.gz',
    compressed: true,
    lastModified: '2021-10-22T12:39:41.033Z',
    bundle: {
      path: '/WT1/matrix.mtx.gz',
    },
    errors: '',
  },
};

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
    files: filesObject,
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

const mockGetS3UploadUrl = jest.fn(() => 'mockedS3UploadUrl');

const mock = jest.fn().mockImplementation(() => ({
  getSamples: mockGetSamples,
  getSamplesByExperimentId: mockGetSamplesByExperimentId,
  updateSamples: mockUpdateSamples,
  deleteSamplesEntry: mockDeleteSamples,
  addSample: mockAddSample,
  removeSamples: mockRemoveSamples, // Missing tests
  getS3UploadUrl: mockGetS3UploadUrl,
}));

module.exports = mock;
