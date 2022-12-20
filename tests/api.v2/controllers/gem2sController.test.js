// @ts-nocheck
const gem2sController = require('../../../src/api.v2/controllers/gem2sController');

const { OK } = require('../../../src/utils/responses');

const gem2s = require('../../../src/api.v2/helpers/pipeline/gem2s');
const parseSNSMessage = require('../../../src/utils/parseSNSMessage');

jest.mock('../../../src/api.v2/helpers/pipeline/gem2s');
jest.mock('../../../src/utils/parseSNSMessage');

const mockJsonSend = jest.fn();
const mockRes = {
  json: jest.fn(),
  status: jest.fn(() => ({ send: mockJsonSend })),
};

const expectedTopic = 'arn:aws:sns:eu-west-1:000000000000:work-results-test-default-v2';

describe('gem2sController', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('runGem2s works correctly', async () => {
    const experimentId = 'experimentId';
    const newExecution = 'mockNewExecution';

    gem2s.startGem2sPipeline.mockReturnValue(newExecution);

    const mockReq = {
      params: { experimentId },
      headers: { authorization: 'mockAuthorization' },
      body: { paramsHash: 'mockParamsHash' },
    };

    await gem2sController.runGem2s(mockReq, mockRes);

    expect(gem2s.startGem2sPipeline).toHaveBeenCalledWith(
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

    const mockReq = {
      params: { experimentId },
    };

    await gem2sController.handleResponse(mockReq, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockReq, expectedTopic);
    expect(gem2s.handleGem2sResponse).toHaveBeenCalledWith(io, parsedMessage);

    // Response is ok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('ok');
  });

  it('handleResponse returns nok when parseSNSMessage fails', async () => {
    const experimentId = 'experimentId';

    parseSNSMessage.mockImplementationOnce(() => Promise.reject(new Error('Invalid sns message')));

    const mockReq = { params: { experimentId } };

    await gem2sController.handleResponse(mockReq, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockReq, expectedTopic);

    expect(gem2s.handleGem2sResponse).not.toHaveBeenCalled();

    // Response is nok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('nok');
  });

  it('handleResponse returns nok when gem2sResponse fails', async () => {
    const experimentId = 'experimentId';

    const io = 'mockIo';
    const parsedMessage = 'mockParsedMessage';

    parseSNSMessage.mockReturnValue({ io, parsedMessage });

    gem2s.handleGem2sResponse.mockImplementationOnce(() => Promise.reject(new Error('Some error with gem2sResponse')));

    const mockReq = { params: { experimentId } };

    await gem2sController.handleResponse(mockReq, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockReq, expectedTopic);
    expect(gem2s.handleGem2sResponse).toHaveBeenCalledWith(io, parsedMessage);

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

    await gem2sController.handleResponse(mockReq, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockReq, expectedTopic);
    expect(gem2s.handleGem2sResponse).not.toHaveBeenCalled();

    // Response is ok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('ok');
  });
});
