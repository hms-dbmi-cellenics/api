// Disabled ts because it doesn't recognize jest mocks
// @ts-nocheck
const UserAccess = require('../../../../src/api.v2/model/UserAccess');

const postRegistrationHandler = require('../../../../src/api.v2/helpers/access/postRegistrationHandler');
const { OK } = require('../../../../src/utils/responses');

jest.mock('../../../../src/api.v2/model/UserAccess');

const mockUserAccess = {
  registerNewUserAccess: jest.fn(),
};

UserAccess.mockReturnValue(mockUserAccess);

describe('postRegistrationHandler', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('Registers new user on correct message', async () => {
    const mockUserEmail = 'mock-user-email';
    const mockUserId = 'mock-user-email';

    const mockReq = {
      body: {
        userEmail: mockUserEmail,
        userId: mockUserId,
      },
    };

    const res = await postRegistrationHandler(mockReq);

    expect(mockUserAccess.registerNewUserAccess).toHaveBeenCalledWith(mockUserEmail, mockUserId);
    expect(mockUserAccess.registerNewUserAccess).toHaveBeenCalledTimes(1);

    expect(res).toEqual(OK());
  });
});
