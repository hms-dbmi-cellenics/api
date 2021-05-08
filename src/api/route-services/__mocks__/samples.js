const mockGetSamples = jest.fn(() => new Promise((resolve) => {
  resolve({
    samples: {
      ids: ['sample-1'],
      'sample-1': {
        name: 'sample-1',
      },
    },
  });
}));

const mockGetSampleIds = jest.fn(() => new Promise((resolve) => {
  resolve({
    samples: {
      ids: ['sample-1', 'sample-2'],
    },
  });
}));

const mockUpdateSamples = jest.fn((projectUuid, body) => {
  if (!projectUuid
    || !body
    || !body.experimentId
    || !body.projectUuid
    || !body.samples
  ) {
    throw new Error('Validation error');
  }

  return Promise.resolve({
    ids: ['sample-1'],
    'sample-1': {
      name: 'sample-1',
    },
  });
});

const mock = jest.fn().mockImplementation(() => ({
  getSamples: mockGetSamples,
  getSampleIds: mockGetSampleIds,
  updateSamples: mockUpdateSamples,
}));

module.exports = mock;
