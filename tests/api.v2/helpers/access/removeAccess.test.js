// Disabled ts because it doesn't recognize jest mocks
// @ts-nocheck
const UserAccess = require('../../../../src/api.v2/model/UserAccess');

const removeAccess = require('../../../../src/api.v2/helpers/access/removeAccess');

jest.mock('../../../../src/utils/aws/user', () => ({
  getAwsUserAttributesByEmail: jest.fn(() => [
    { Name: 'sub', Value: 'mock-user-id' },
    { Name: 'email_verified', Value: 'true' },
    { Name: 'name', Value: 'mock user' },
    { Name: 'email', Value: 'mock.user@example.com' }]),
}));

jest.mock('../../../../src/api.v2/model/UserAccess');

const mockUserAccess = {
  removeAccess: jest.fn(),
};

UserAccess.mockReturnValue(mockUserAccess);

const experimentId = 'experimentId';

describe('removeAccess', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('removeAccess provides the correct user details to remove', async () => {
    await removeAccess(experimentId);

    expect(mockUserAccess.removeAccess).toHaveBeenCalledWith('mock-user-id', experimentId);
    expect(mockUserAccess.removeAccess).toHaveBeenCalledTimes(1);
  });
});
