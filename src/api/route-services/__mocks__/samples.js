const { OK } = require('../../../utils/responses');

const mockSamples = {
  ids: ['sample-1'],
  'sample-1': {
    name: 'sample-1',
    projectUuid: 'project-1',
    uuid: 'sample-1',
    type: '10x',
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

const mockGetSamples = jest.fn(() => new Promise((resolve) => {
  resolve(mockSamples);
}));


const mockGetByExperimentId = jest.fn((experimentId) => new Promise((resolve, reject) => {
  if (experimentId === 'nonExistentId') {
    const err = new Error('ID does not exists');
    err.status = 404;

    reject(err);
  }

  return resolve(mockSamples);
}));

const mockUpdateSamples = jest.fn((projectUuid, body) => new Promise((resolve, reject) => {
  if (!projectUuid
    || !body
    || !body.experimentId
    || !body.projectUuid
    || !body.samples
  ) {
    const err = new Error('Invalid body');
    err.status = 400;

    reject(err);
  }

  resolve({ data: { message: 'sucess', code: 200 } });
}));

const mockDeleteSamples = jest.fn((projectUuid, sampleUuid) => new Promise((resolve, reject) => {
  if (projectUuid === 'unknown-project' || sampleUuid === 'unknown-sample') {
    const err = new Error('Unkonwn project or sample');
    err.status = 404;

    reject(err);
  }

  if (!projectUuid || !sampleUuid) {
    const err = new Error('invalid body');
    err.status = 400;

    reject(err);
  }

  resolve(OK());
}));

const mock = jest.fn().mockImplementation(() => ({
  getSamples: mockGetSamples,
  getSamplesByExperimentId: mockGetByExperimentId,
  updateSamples: mockUpdateSamples,
  deleteSamplesEntry: mockDeleteSamples,
}));

module.exports = mock;
