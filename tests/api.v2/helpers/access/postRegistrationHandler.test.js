// Disabled ts because it doesn't recognize jest mocks
// @ts-nocheck
const UserAccess = require('../../../../src/api.v2/model/UserAccess');

const postRegistrationHandler = require('../../../../src/api.v2/helpers/access/postRegistrationHandler');
const parseSNSMessage = require('../../../../src/utils/parse-sns-message');

jest.mock('../../../../src/utils/parse-sns-message');
jest.mock('../../../../src/api.v2/model/UserAccess');

const mockUserAccess = {
  registerNewUserAccess: jest.fn(),
};

UserAccess.mockReturnValue(mockUserAccess);

const experimentId = 'experimentId';

describe('postRegistrationHandler', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('Registers new user on correct message', async () => {
    const mockUserEmail = 'mock-user-email';
    const mockUserId = 'mock-user-email';

    const mockMessage = {
      msg: { Type: 'Notification' },
      parsedMessage: {
        userEmail: mockUserEmail,
        userId: mockUserId,
      },
    };

    parseSNSMessage.mockImplementationOnce(() => Promise.resolve(mockMessage));

    await postRegistrationHandler();

    expect(mockUserAccess.registerNewUserAccess).toHaveBeenCalledWith(mockUserEmail, mockUserId);
    expect(mockUserAccess.registerNewUserAccess).toHaveBeenCalledTimes(1);
  });

  it('Does not proceed to registration if SNS message is subscription confirmation', async () => {
    const mockSubscriptionConfirmation = {
      msg: {
        type: 'SubsciprtionConfirmation',
      },
    };

    parseSNSMessage.mockImplementationOnce(() => Promise.resolve(mockSubscriptionConfirmation));

    await postRegistrationHandler(experimentId);

    expect(mockUserAccess.registerNewUserAccess).not.toHaveBeenCalled();
  });

  it('Does not do anything on invalid SNS message', async () => {
    parseSNSMessage.mockImplementationOnce(() => Promise.reject(new Error('Invalid SNS message')));

    await postRegistrationHandler(experimentId);

    expect(mockUserAccess.registerNewUserAccess).not.toHaveBeenCalled();
  });
});
