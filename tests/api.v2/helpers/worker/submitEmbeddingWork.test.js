const createObjectHash = require('../../../../src/api.v2/helpers/worker/createObjectHash');
const submitEmbeddingWork = require('../../../../src/api.v2/helpers/worker/workSubmit/submitEmbeddingWork');
const validateAndSubmitWork = require('../../../../src/api.v2/events/validateAndSubmitWork');


jest.mock('../../../../src/api.v2/helpers/worker/createObjectHash');
jest.mock('../../../../src/api.v2/helpers/pipeline/getPipelineStatus');
jest.mock('../../../../src/api.v2/helpers/worker/getWorkerStatus');
jest.mock('../../../../src/api.v2/events/validateAndSubmitWork');


const message = {
  experimentId: '6463cb35-3e08-4e94-a181-6d155a5ca570',
  taskName: 'configureEmbedding',
  input: {
    experimentId: '6463cb35-3e08-4e94-a181-6d155a5ca570',
    taskName: 'configureEmbedding',
    processName: 'qc',
    sampleUuid: '',
    uploadCountMatrix: false,
    authJWT: 'Bearer whatever',
    config: {
      embeddingSettings: {
        method: 'umap',
        methodSettings: {
          tsne: { perplexity: 30, learningRate: 200 },
          umap: { distanceMetric: 'cosine', minimumDistance: 0.3 },
        },
      },
      clusteringSettings: {
        method: 'louvain',
        methodSettings: { louvain: { resolution: 0.8 } },
      },
    },

  },
  output: {
    bucket: 'worker-results-development-000000000000',
    key: '0eabfedf-0efe-4abf-8725-7062c54ed5e1',
  },
  response: { error: false },
  pipelineVersion: 2,
  apiUrl: null,
};

describe('submitWorkEmbedding', () => {
  // If this test fails it means you have changed parameters upon which the feature or precomputing
  // the embedding / marker heatmp feature depends on. These parameters are duplicated
  // in the UI / API if you have changed them here, make sure you change them in the
  // other repository or that feature will stop working.
  it('submits the work and the ETag / params are correct', async () => {
    const ETag = await submitEmbeddingWork(message);

    // these are the parameters used to created the ETag and
    // they should match exactly UI snapshot:
    // loadEmbedding.defaultParams.test.js.snap
    expect(createObjectHash.mock.calls).toMatchSnapshot();
    // this ETag should match exactly the one in
    // loadEmbedding.defaultParams.test.js
    expect(ETag).toEqual('fb7a8a67c7806fa90c69b9cdb16dd478'); // pragma: allowlist secret
    expect(validateAndSubmitWork).toBeCalledTimes(1);
  });
});
