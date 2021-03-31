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

const mock = jest.fn().mockImplementation(() => ({
  getSamples: mockGetSamples,
  getSampleIds: mockGetSampleIds,
}));

module.exports = mock;
