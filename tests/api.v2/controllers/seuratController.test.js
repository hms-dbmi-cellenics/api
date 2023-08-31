// @ts-nocheck
const ExperimentParent = require('../../../src/api.v2/model/ExperimentParent');

const seuratController = require('../../../src/api.v2/controllers/seuratController');

const { OK } = require('../../../src/utils/responses');

const seurat = require('../../../src/api.v2/helpers/pipeline/seurat');
const parseSNSMessage = require('../../../src/utils/parseSNSMessage');

const experimentParentInstance = ExperimentParent();

jest.mock('../../../src/api.v2/model/ExperimentParent');
jest.mock('../../../src/api.v2/helpers/pipeline/seurat');
jest.mock('../../../src/utils/parseSNSMessage');

const mockJsonSend = jest.fn();
const mockRes = {
  json: jest.fn(),
  status: jest.fn(() => ({ send: mockJsonSend })),
};

const experimentId = '0b5f622a-01b8-254c-6b69-9e2606ac0b40';
const expectedTopic = 'arn:aws:sns:eu-west-1:000000000000:work-results-test-default-v2';
const io = 'mockIo';

const parsedMessage = {
  taskName: 'mockTask',
  experimentId,
  apiUrl: 'https://mock-sandbox-id.biomage.net',
  input: {
    authJWT: 'Bearer mockBearer',
    experimentId,
    sandboxId: 'mock-sandbox-id',
    activityId: 'pipeline-mock-activity-id',
    processName: 'seurat',
  },
};

const mockSNSResponse = { body: JSON.stringify(parsedMessage) };

describe('seuratController', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('runSeurat works correctly', async () => {
    const mockExecutionParams = {
      experimentId,
    };

    experimentParentInstance.find.mockReturnValueOnce(
      { first: () => Promise.resolve({}) },
    );

    const mockReq = {
      params: { experimentId },
      headers: { authorization: 'mockAuthorization' },
    };

    await seuratController.handleSeuratRequest(mockReq, mockRes);

    expect(seurat.runSeurat).toHaveBeenCalledWith(
      mockExecutionParams, mockReq.headers.authorization,
    );

    // Response is ok
    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });

  it('handleResponse handles success message correctly', async () => {
    parseSNSMessage.mockReturnValue({ io, parsedMessage });

    await seuratController.handleResponse(mockSNSResponse, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockSNSResponse, expectedTopic);
    expect(seurat.handleSeuratResponse).toHaveBeenCalledWith(io, parsedMessage);

    // Response is ok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('ok');
  });

  it('handleResponse returns nok when parseSNSMessage fails', async () => {
    parseSNSMessage.mockImplementationOnce(() => Promise.reject(new Error('Invalid sns message')));

    await seuratController.handleResponse(mockSNSResponse, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockSNSResponse, expectedTopic);

    expect(seurat.handleSeuratResponse).not.toHaveBeenCalled();

    // Response is nok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('nok');
  });

  it('handleResponse returns nok when seuratResponse fails', async () => {
    parseSNSMessage.mockReturnValue({ io, parsedMessage });

    seurat.handleSeuratResponse.mockImplementationOnce(() => Promise.reject(new Error('Some error with seuratResponse')));

    await seuratController.handleResponse(mockSNSResponse, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockSNSResponse, expectedTopic);
    expect(seurat.handleSeuratResponse).toHaveBeenCalledWith(io, parsedMessage);

    // Response is nok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('nok');
  });

  it('handleResponse ignores message if it isnt an sns notification', async () => {
    const undefinedMessage = undefined;

    parseSNSMessage.mockReturnValue({ io, undefinedMessage });

    await seuratController.handleResponse(mockSNSResponse, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockSNSResponse, expectedTopic);
    expect(seurat.handleSeuratResponse).not.toHaveBeenCalled();

    // Response is ok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('ok');
  });
});
