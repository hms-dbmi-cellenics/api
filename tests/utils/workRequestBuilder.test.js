const workRequestBuilder = require('../../src/utils/workRequestBuilder');
const WorkSubmitService = require('../../src/api/general-services/work-submit');

describe('workRequestBuilder', () => {
  it('Should fail if incorrect taskname is given', async () => {
    await expect(workRequestBuilder('test', {})).rejects.toThrow(Error);
  });

  it('Should give the correct settings', async () => {
    const config = {
      experimentId: '7d9318d157a6b17d3d6caec23a25cc86',
      body: {
        name: 'GetEmbedding',
        type: 'umap',
        config: { minimumDistance: 0.3, distanceMetric: 'euclidean' },
      },
    };
    const workRequest = await workRequestBuilder('GetEmbedding', config);

    expect(workRequest).toBeInstanceOf(WorkSubmitService);
  });

  it('Should fail if not given the correct task schema', async () => {
    const invalidConfig = {
      experimentId: '7d9318d157a6b17d3d6caec23a25cc86',
      body: {
        name: 'GetEmbedding',
        type: 'umap',
        config: { someConfig: false },
      },
    };

    await expect(workRequestBuilder('GetEmbedding', invalidConfig)).rejects.toThrow(Error);
  });
});
