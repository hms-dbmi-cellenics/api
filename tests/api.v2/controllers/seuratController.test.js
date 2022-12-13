// @ts-nocheck
const seuratController = require('../../../src/api.v2/controllers/seuratController');

const { OK } = require('../../../src/utils/responses');

const seurat = require('../../../src/api.v2/helpers/pipeline/seurat');
const parseSNSMessage = require('../../../src/utils/parseSNSMessage');

jest.mock('../../../src/api.v2/helpers/pipeline/seurat');
jest.mock('../../../src/utils/parseSNSMessage');

const mockJsonSend = jest.fn();
const mockRes = {
  json: jest.fn(),
  status: jest.fn(() => ({ send: mockJsonSend })),
};

const expectedTopic = 'arn:aws:sns:eu-west-1:000000000000:work-results-test-default-v2';

describe('seuratController', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('runSeurat works correctly', async () => {
    const experimentId = 'experimentId';
    const newExecution = 'mockNewExecution';

    seurat.createSeuratPipeline.mockReturnValue(newExecution);

    const mockReq = {
      params: { experimentId },
      headers: { authorization: 'mockAuthorization' },
      body: { paramsHash: 'mockParamsHash' },
    };

    await seuratController.runSeurat(mockReq, mockRes);

    expect(seurat.createSeuratPipeline).toHaveBeenCalledWith(
      experimentId, mockReq.body, mockReq.headers.authorization,
    );

    // Response is ok
    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });

  it('handleResponse works correctly', async () => {
    const experimentId = 'experimentId';

    const io = 'mockIo';
    const parsedMessage = 'mockParsedMessage';

    parseSNSMessage.mockReturnValue({ io, parsedMessage });

    const mockReq = { params: { experimentId } };

    await seuratController.handleResponse(mockReq, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockReq, expectedTopic);
    expect(seurat.handleSeuratResponse).toHaveBeenCalledWith(io, parsedMessage);

    // Response is ok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('ok');
  });

  it('handleResponse returns nok when parseSNSMessage fails', async () => {
    const experimentId = 'experimentId';

    parseSNSMessage.mockImplementationOnce(() => Promise.reject(new Error('Invalid sns message')));

    const mockReq = { params: { experimentId } };

    await seuratController.handleResponse(mockReq, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockReq, expectedTopic);

    expect(seurat.handleSeuratResponse).not.toHaveBeenCalled();

    // Response is nok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('nok');
  });

  it('handleResponse returns nok when seuratResponse fails', async () => {
    const experimentId = 'experimentId';

    const io = 'mockIo';
    const parsedMessage = 'mockParsedMessage';

    parseSNSMessage.mockReturnValue({ io, parsedMessage });

    seurat.handleSeuratResponse.mockImplementationOnce(() => Promise.reject(new Error('Some error with seuratResponse')));

    const mockReq = { params: { experimentId } };

    await seuratController.handleResponse(mockReq, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockReq, expectedTopic);
    expect(seurat.handleSeuratResponse).toHaveBeenCalledWith(io, parsedMessage);

    // Response is nok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('nok');
  });

  it('handleResponse ignores message if it isnt an sns notification', async () => {
    const experimentId = 'experimentId';

    const io = 'mockIo';
    const parsedMessage = undefined;

    parseSNSMessage.mockReturnValue({ io, parsedMessage });

    const mockReq = { params: { experimentId } };

    await seuratController.handleResponse(mockReq, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockReq, expectedTopic);
    expect(seurat.handleSeuratResponse).not.toHaveBeenCalled();

    // Response is ok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('ok');
  });
});
