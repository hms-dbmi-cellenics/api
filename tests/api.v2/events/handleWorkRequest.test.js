const handleWorkRequest = require('../../../src/api.v2/events/handleWorkRequest');
const validateAndSubmitWork = require('../../../src/api.v2/events/validateAndSubmitWork');
const fake = require('../../test-utils/constants');

jest.mock('../../../src/api.v2/middlewares/authMiddlewares');

jest.mock('../../../src/api.v2/events/validateAndSubmitWork', () => jest.fn());

const data = {
  uuid: 'someuuid-asd-asd-asdddasa',
  Authorization: 'Bearer some-token',
  experimentId: fake.EXPERIMENT_ID,
};

describe('Handle work socket callback', () => {
  const mockSocket = { emit: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits work', async () => {
    validateAndSubmitWork.mockImplementation(() => Promise.resolve());

    await handleWorkRequest(mockSocket, data);
    expect(mockSocket.emit.mock.calls[0]).toMatchSnapshot();
    expect(validateAndSubmitWork.mock.calls[0]).toMatchSnapshot();
  });

  it('If the worker fails, the API emits a work-response with error', async () => {
    validateAndSubmitWork.mockImplementation(() => Promise.reject({ message: 'fail' }));

    await handleWorkRequest(mockSocket, data);
    expect(mockSocket.emit.mock.calls[0]).toMatchSnapshot();
    expect(validateAndSubmitWork.mock.calls[0]).toMatchSnapshot();
  });

  it('data without authorization also throws an error', async () => {
    delete data.Authorization;
    await handleWorkRequest(mockSocket, data);
    expect(mockSocket.emit.mock.calls[0]).toMatchSnapshot();
  });
});
