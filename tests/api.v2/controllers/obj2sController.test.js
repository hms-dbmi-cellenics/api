// @ts-nocheck
const ExperimentParent = require('../../../src/api.v2/model/ExperimentParent');

const obj2sController = require('../../../src/api.v2/controllers/obj2sController');

const { OK } = require('../../../src/utils/responses');

const obj2s = require('../../../src/api.v2/helpers/pipeline/obj2s');
const parseSNSMessage = require('../../../src/utils/parseSNSMessage');

const experimentParentInstance = ExperimentParent();

jest.mock('../../../src/api.v2/model/ExperimentParent');
jest.mock('../../../src/api.v2/helpers/pipeline/obj2s');
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
    processName: 'obj2s',
  },
};

const mockSNSResponse = { body: JSON.stringify(parsedMessage) };

describe('obj2sController', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('runObj2s works correctly', async () => {
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

    await obj2sController.handleObj2sRequest(mockReq, mockRes);

    expect(obj2s.runObj2s).toHaveBeenCalledWith(
      mockExecutionParams, mockReq.headers.authorization,
    );

    // Response is ok
    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });

  it('handleResponse handles success message correctly', async () => {
    parseSNSMessage.mockReturnValue({ io, parsedMessage });

    await obj2sController.handleResponse(mockSNSResponse, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockSNSResponse, expectedTopic);
    expect(obj2s.handleObj2sResponse).toHaveBeenCalledWith(io, parsedMessage);

    // Response is ok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('ok');
  });

  it('handleResponse returns nok when parseSNSMessage fails', async () => {
    parseSNSMessage.mockImplementationOnce(() => Promise.reject(new Error('Invalid sns message')));

    await obj2sController.handleResponse(mockSNSResponse, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockSNSResponse, expectedTopic);

    expect(obj2s.handleObj2sResponse).not.toHaveBeenCalled();

    // Response is nok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('nok');
  });

  it('handleResponse returns nok when obj2sResponse fails', async () => {
    parseSNSMessage.mockReturnValue({ io, parsedMessage });

    obj2s.handleObj2sResponse.mockImplementationOnce(() => Promise.reject(new Error('Some error with obj2sResponse')));

    await obj2sController.handleResponse(mockSNSResponse, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockSNSResponse, expectedTopic);
    expect(obj2s.handleObj2sResponse).toHaveBeenCalledWith(io, parsedMessage);

    // Response is nok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('nok');
  });

  it('handleResponse ignores message if it isnt an sns notification', async () => {
    const undefinedMessage = undefined;

    parseSNSMessage.mockReturnValue({ io, undefinedMessage });

    await obj2sController.handleResponse(mockSNSResponse, mockRes);

    expect(parseSNSMessage).toHaveBeenCalledWith(mockSNSResponse, expectedTopic);
    expect(obj2s.handleObj2sResponse).not.toHaveBeenCalled();

    // Response is ok
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockJsonSend).toHaveBeenCalledWith('ok');
  });
});
