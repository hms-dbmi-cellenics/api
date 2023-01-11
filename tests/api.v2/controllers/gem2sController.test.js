// @ts-nocheck

const Experiment = require('../../../src/api.v2/model/Experiment');

const gem2sController = require('../../../src/api.v2/controllers/gem2sController');

const { OK } = require('../../../src/utils/responses');

const gem2s = require('../../../src/api.v2/helpers/pipeline/gem2s');
const parseSNSMessage = require('../../../src/utils/parseSNSMessage');

const experimentInstance = Experiment();

jest.mock('../../../src/api.v2/model/Experiment');
jest.mock('../../../src/api.v2/helpers/pipeline/gem2s');
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
    processName: 'gem2s',
  },
};

const mockSNSResponse = { body: JSON.stringify(parsedMessage) };

describe('gem2sController', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('runGem2s works correctly', async () => {
    const newExecution = 'mockNewExecution';

    gem2s.startGem2sPipeline.mockReturnValue(newExecution);

    experimentInstance.findById.mockReturnValueOnce(
      { first: () => Promise.resolve({ canRerunGem2S: true }) },
    );

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

  it('handleResponse handles success message correctly', async () => {
    parseSNSMessage.mockReturnValue({ io, parsedMessage });

    await gem2sController.handleResponse(mockSNSResponse, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockSNSResponse, expectedTopic);
    expect(gem2s.handleGem2sResponse).toHaveBeenCalledWith(io, parsedMessage);

    // Response is ok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('ok');
  });

  it('handleResponse returns nok when parseSNSMessage fails', async () => {
    parseSNSMessage.mockImplementationOnce(() => Promise.reject(new Error('Invalid sns message')));

    await gem2sController.handleResponse(mockSNSResponse, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockSNSResponse, expectedTopic);

    expect(gem2s.handleGem2sResponse).not.toHaveBeenCalled();

    // Response is nok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('nok');
  });

  it('handleResponse returns nok when gem2sResponse fails', async () => {
    parseSNSMessage.mockReturnValue({ io, parsedMessage });

    gem2s.handleGem2sResponse.mockImplementationOnce(() => Promise.reject(new Error('Some error with gem2sResponse')));

    await gem2sController.handleResponse(mockSNSResponse, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockSNSResponse, expectedTopic);
    expect(gem2s.handleGem2sResponse).toHaveBeenCalledWith(io, parsedMessage);

    // Response is nok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('nok');
  });

  it('handleResponse ignores message if it isnt an sns notification', async () => {
    const undefinedMessage = undefined;

    parseSNSMessage.mockReturnValue({ io, undefinedMessage });

    await gem2sController.handleResponse(mockSNSResponse, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockSNSResponse, expectedTopic);
    expect(gem2s.handleGem2sResponse).not.toHaveBeenCalled();

    // Response is ok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('ok');
  });
});
