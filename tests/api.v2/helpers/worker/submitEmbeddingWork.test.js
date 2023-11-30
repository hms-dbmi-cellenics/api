const AWSMock = require('aws-sdk-mock');
const _ = require('lodash');

const createObjectHash = require('../../../../src/api.v2/helpers/worker/createObjectHash');
const submitEmbeddingWork = require('../../../../src/api.v2/helpers/worker/workSubmit/submitEmbeddingWork');
const validateAndSubmitWork = require('../../../../src/api.v2/events/validateAndSubmitWork');
const { mockS3GetObject } = require('../../../test-utils/mockAWSServices');


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
  beforeEach(() => {
    AWSMock.restore();
    process.env.USE_CACHE = 'true';
  });

  it('submits the work and the ETag / params are correct', async () => {
    mockS3GetObject({ Body: '{}' });

    const ETag = await submitEmbeddingWork(message);

    expect(createObjectHash.mock.calls).toMatchSnapshot();
    expect(ETag).toMatchSnapshot();
    expect(validateAndSubmitWork).toBeCalledTimes(1);
  });

  it('submits the work and the ETag / params are correct', async () => {
    mockS3GetObject({ Body: '{}' });

    message.input.config.embeddingSettings.useSaved = true;

    const ETag = await submitEmbeddingWork(message);

    expect(ETag).toBeNull();
    expect(validateAndSubmitWork).toBeCalledTimes(1);
  });
});
