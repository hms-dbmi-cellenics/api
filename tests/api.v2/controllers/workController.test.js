// @ts-nocheck
const workController = require('../../../src/api.v2/controllers/workController');
const handleWorkRequest = require('../../../src/api.v2/events/handleWorkRequest');

jest.mock('../../../src/api.v2/events/handleWorkRequest');

const mockRes = {
  json: jest.fn(),
  status: jest.fn(() => ({
    json: jest.fn(),
  })),
};

const mockReq = {
  headers: {
    authorization: 'Bearer mockToken',
  },
  body: {
    experimentId: 'test-experiment-id',
    body: { name: 'test-body' },
    requestProps: { timeout: 30 },
  },
};

describe('workController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submitWork returns data when work request succeeds', async () => {
    const mockResponse = {
      ETag: 'mock-etag',
      signedUrl: 'https://mock-url.com',
    };

    handleWorkRequest.mockResolvedValue(mockResponse);

    await workController.submitWork(mockReq, mockRes);

    expect(handleWorkRequest).toHaveBeenCalledWith(
      mockReq.headers.authorization,
      mockReq.body,
    );

    expect(mockRes.json).toHaveBeenCalledWith({ data: mockResponse });
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('submitWork returns 503 status when worker startup times out', async () => {
    const mockResponse = {
      ETag: 'mock-etag',
      signedUrl: null,
      errorCode: 'WORKER_STARTUP_TIMEOUT',
    };

    handleWorkRequest.mockResolvedValue(mockResponse);

    const mockStatusJson = jest.fn();
    mockRes.status.mockReturnValue({ json: mockStatusJson });

    await workController.submitWork(mockReq, mockRes);

    expect(handleWorkRequest).toHaveBeenCalledWith(
      mockReq.headers.authorization,
      mockReq.body,
    );

    expect(mockRes.status).toHaveBeenCalledWith(503);
    expect(mockStatusJson).toHaveBeenCalledWith({
      error: {
        code: 'WORKER_STARTUP_TIMEOUT',
        message: 'Worker failed to start within timeout',
      },
      data: { ETag: 'mock-etag', signedUrl: null },
    });
    expect(mockRes.json).not.toHaveBeenCalled();
  });

  it('submitWork returns data with null signedUrl when work is queued', async () => {
    const mockResponse = {
      ETag: 'mock-etag',
      signedUrl: null,
    };

    handleWorkRequest.mockResolvedValue(mockResponse);

    await workController.submitWork(mockReq, mockRes);

    expect(handleWorkRequest).toHaveBeenCalledWith(
      mockReq.headers.authorization,
      mockReq.body,
    );

    expect(mockRes.json).toHaveBeenCalledWith({ data: mockResponse });
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});
