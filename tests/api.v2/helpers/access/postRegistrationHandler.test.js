// Disabled ts because it doesn't recognize jest mocks
// @ts-nocheck
const crypto = require('crypto');
const UserAccess = require('../../../../src/api.v2/model/UserAccess');

const postRegistrationHandler = require('../../../../src/api.v2/helpers/access/postRegistrationHandler');
const { OK, BadRequestError } = require('../../../../src/utils/responses');
const config = require('../../../../src/config');

jest.mock('../../../../src/api.v2/model/UserAccess');

const mockUserAccess = {
  registerNewUserAccess: jest.fn(),
};

UserAccess.mockReturnValue(mockUserAccess);

describe('postRegistrationHandler', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('Associates new users with experiemnts correctly', async () => {
    const ENC_METHOD = 'aes-256-cbc';

    const mockKey = crypto.createHash('sha512').update(config.domainName)
      .digest('hex')
      .substring(0, 32);

    // iv length has to be 16
    const mockIV = '1234567890111213';

    const mockUserEmail = 'mock-user-email';
    const mockUserId = 'mock-user-email';

    const payload = {
      userEmail: mockUserEmail,
      userId: mockUserId,
    };

    const cipher = crypto.createCipheriv(ENC_METHOD, mockKey, mockIV);
    const encryptedBody = Buffer.from(
      cipher.update(JSON.stringify(payload), 'utf8', 'hex') + cipher.final('hex'),
    ).toString('base64');

    const mockReq = {
      body: `${encryptedBody}.${mockIV}`,
    };
    const res = await postRegistrationHandler(mockReq);

    expect(mockUserAccess.registerNewUserAccess).toHaveBeenCalledWith(mockUserEmail, mockUserId);
    expect(mockUserAccess.registerNewUserAccess).toHaveBeenCalledTimes(1);

    expect(res).toEqual(OK());
  });

  it('Throws an error if message is invalid', async () => {
    const mockReq = {
      body: 'SomeInvalidMessage',
    };

    await expect(postRegistrationHandler(mockReq)).rejects.toThrowError(BadRequestError);
  });
});
