// @ts-nocheck
const qcController = require('../../../src/api.v2/controllers/qcController');

const { OK } = require('../../../src/utils/responses');

const handleQCResponse = require('../../../src/api.v2/helpers/pipeline/handleQCResponse');
const pipelineConstruct = require('../../../src/api.v2/helpers/pipeline/pipelineConstruct');

const parseSNSMessage = require('../../../src/utils/parseSNSMessage');

jest.mock('../../../src/api.v2/helpers/pipeline/handleQCResponse');
jest.mock('../../../src/api.v2/helpers/pipeline/pipelineConstruct');
jest.mock('../../../src/utils/parseSNSMessage');

// const MockDataFactory = require('../../../src/api/route-services/__mocks__/MockDataFactory');
const experimentId = 'experimentId';

const processingConfigUpdate = [{
  name: 'numGenesVsNumUmis',
  body: {
    auto: true,
    enabled: true,
    filterSettings: { regressionType: 'linear', regressionTypeSettings: { linear: { 'p.level': 0.001 }, spline: { 'p.level': 0.001 } } },
    'f87892f0-3403-4ba9-b871-c366e3fa855e': {
      auto: false,
      enabled: true,
      filterSettings: { regressionType: 'linear', regressionTypeSettings: { linear: { 'p.level': 0.00095 }, spline: { 'p.level': 0.001 } } },
      defaultFilterSettings: { regressionType: 'linear', regressionTypeSettings: { linear: { 'p.level': 0.001 }, spline: { 'p.level': 0.001 } } },
    },
  },
}];

const qcResponsePayload = {
  experimentId,
  taskName: 'configureEmbedding',
  input: {
    experimentId,
    taskName: 'configureEmbedding',
    processName: 'qc',
    config: {
      embeddingSettings:
      {
        method: 'umap',
        methodSettings: {
          tsne: { perplexity: 9.18, learningRate: 200 },
          umap: { distanceMetric: 'cosine', minimumDistance: 0.3 },
        },
      },
      clusteringSettings: { method: 'louvain', methodSettings: { louvain: { resolution: 0.8 } } },
    },
    sampleUuid: '',
    uploadCountMatrix: false,
    authJWT: 'Bearer someLongAndConfusingString',
  },
  output: { bucket: 'worker-results-development', key: 'de2f3434-dc63-4007-907b-28d3e72b140d' },
  response: { error: false },
};

const mockJsonSend = jest.fn();
const mockRes = {
  json: jest.fn(),
  status: jest.fn(() => ({ send: mockJsonSend })),
};

describe('qcController', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('runQC works correctly with processingConfig changes', async () => {
    const authorization = 'mockAuthorization';
    const newExecution = { stateMachineArn: 'mockStateMachineArn', executionArn: 'mockExecutionArn' };

    pipelineConstruct.createQCPipeline.mockReturnValue(newExecution);

    const mockReq = {
      params: { experimentId },
      headers: { authorization },
      body: { processingConfig: processingConfigUpdate },
    };

    await qcController.runQC(mockReq, mockRes);

    expect(pipelineConstruct.createQCPipeline).toHaveBeenCalledWith(
      experimentId, processingConfigUpdate, authorization,
    );

    // Response is ok
    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });


  it('runQC works correctly without processingConfig changes', async () => {
    const authorization = 'mockAuthorization';
    const newExecution = { stateMachineArn: 'mockStateMachineArn', executionArn: 'mockExecutionArn' };

    pipelineConstruct.createQCPipeline.mockReturnValue(newExecution);

    const mockReq = {
      params: { experimentId },
      headers: { authorization },
      body: { processingConfig: [] },
    };

    await qcController.runQC(mockReq, mockRes);

    expect(pipelineConstruct.createQCPipeline).toHaveBeenCalledWith(
      experimentId, [], authorization,
    );

    // Response is ok
    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });

  it('handleResponse works correctly', async () => {
    const io = 'mockIo';

    parseSNSMessage.mockReturnValue({ io, parsedMessage: qcResponsePayload });

    const mockReq = { params: { experimentId } };

    await qcController.handleResponse(mockReq, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockReq);
    expect(handleQCResponse).toHaveBeenCalledWith(io, qcResponsePayload);

    // Response is ok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('ok');
  });

  it('handleResponse returns nok when parseSNSMessage fails', async () => {
    parseSNSMessage.mockImplementationOnce(() => Promise.reject(new Error('Invalid sns message')));

    const mockReq = { params: { experimentId } };

    await qcController.handleResponse(mockReq, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockReq);
    expect(handleQCResponse).not.toHaveBeenCalled();

    // Response is nok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('nok');
  });

  it('handleResponse returns nok when gem2sResponse fails', async () => {
    const io = 'mockIo';

    parseSNSMessage.mockReturnValue({ io, parsedMessage: qcResponsePayload });

    handleQCResponse.mockImplementationOnce(() => Promise.reject(new Error('Some error with qcResponse')));

    const mockReq = { params: { experimentId } };

    await qcController.handleResponse(mockReq, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockReq);
    expect(handleQCResponse).toHaveBeenCalledWith(io, qcResponsePayload);

    // Response is nok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('nok');
  });

  it('handleResponse ignores message if it isnt an sns notification', async () => {
    const io = 'mockIo';

    parseSNSMessage.mockReturnValue({ io, parsedMessage: undefined });

    const mockReq = { params: { experimentId } };

    await qcController.handleResponse(mockReq, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockReq);
    expect(handleQCResponse).not.toHaveBeenCalled();

    // Response is ok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('ok');
  });
});
