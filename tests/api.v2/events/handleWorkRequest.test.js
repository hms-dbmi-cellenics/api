const handleWorkRequest = require('../../../src/api.v2/events/handleWorkRequest');
const fake = require('../../test-utils/constants');

jest.mock('../../../src/api.v2/middlewares/authMiddlewares');
jest.mock('aws-xray-sdk');
jest.mock('../../../src/api.v2/events/validateAndSubmitWork', () => (data) => {
  if (data.uuid === 'invalid') {
    throw new Error('invalid request');
  }
  return jest.fn();
});


const data = {
  uuid: 'someuuid-asd-asd-asdddasa',
  Authorization: 'Bearer some-token',
  experimentId: fake.EXPERIMENT_ID,
};

describe('Handle work socket callback', () => {
  const mockSocket = { emit: jest.fn() };
  const mockXraySegment = { addError: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits work', async () => {
    await handleWorkRequest(mockSocket, data, mockXraySegment);
    expect(mockSocket.emit.mock.calls[0]).toMatchSnapshot();
  });

  it('Failing submits a work-response with error', async () => {
    data.uuid = 'invalid';
    await handleWorkRequest(mockSocket, data, mockXraySegment);
    expect(mockSocket.emit.mock.calls[0]).toMatchSnapshot();
    expect(mockXraySegment.addError).toHaveBeenCalled();
  });
});
