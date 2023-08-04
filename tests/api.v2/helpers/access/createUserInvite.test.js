// Disabled ts because it doesn't recognize jest mocks
// @ts-nocheck
const UserAccess = require('../../../../src/api.v2/model/UserAccess');

const createUserInvite = require('../../../../src/api.v2/helpers/access/createUserInvite');
const AccessRole = require('../../../../src/utils/enums/AccessRole');
const sendEmail = require('../../../../src/utils/sendEmail');
const { getAwsUserAttributes } = require('../../../../src/utils/aws/user');

jest.mock('../../../../src/utils/aws/user');
jest.mock('../../../../src/api.v2/model/UserAccess');
jest.mock('../../../../src/utils/sendEmail');

const mockUserAccess = {
  grantAccess: jest.fn(),
  addToInviteAccess: jest.fn(),
};

UserAccess.mockReturnValue(mockUserAccess);

const mockExperimentId = 'experimentId';
const mockInvitedUserEmail = 'invited@example.com';
const mockInviterUser = { email: 'inviter@example.com' };
const mockRole = AccessRole.EXPLORER;

process.env.DOMAIN_NAME = 'localhost.test';

describe('creatUserInvite', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('Grants access if user is already registered and sends an email', async () => {
    getAwsUserAttributes.mockImplementationOnce(() => [
      { Name: 'sub', Value: 'mock-user-id' },
      { Name: 'email_verified', Value: 'true' },
      { Name: 'name', Value: 'Mock Invited' },
      { Name: 'email', Value: 'invited@example.com' }]);

    await createUserInvite(mockExperimentId, mockInvitedUserEmail, mockRole, mockInviterUser);

    expect(mockUserAccess.grantAccess).toHaveBeenCalledWith('mock-user-id', mockExperimentId, mockRole);
    expect(mockUserAccess.grantAccess).toHaveBeenCalledTimes(1);

    expect(sendEmail).toHaveBeenCalledTimes(1);

    const emailBody = sendEmail.mock.calls[0][0];

    expect(emailBody).toMatchSnapshot();
  });

  it('Sends an invitation to sign up if user is not registered', async () => {
    getAwsUserAttributes.mockImplementationOnce(() => {
      const error = Object.assign(new Error('User not found'), { code: 'UserNotFoundException' });
      throw error;
    });

    await createUserInvite(mockExperimentId, mockInvitedUserEmail, mockRole, mockInviterUser);

    expect(mockUserAccess.addToInviteAccess).toHaveBeenCalledWith(mockInvitedUserEmail, mockExperimentId, mockRole);
    expect(mockUserAccess.addToInviteAccess).toHaveBeenCalledTimes(1);

    expect(sendEmail).toHaveBeenCalledTimes(1);

    const emailBody = sendEmail.mock.calls[0][0];

    expect(emailBody).toMatchSnapshot();
  });

  it('Throws error if there is an error when trying to check for existence of invited user', async () => {
    getAwsUserAttributes.mockImplementationOnce(() => Promise.reject(new Error('Some error')));

    expect(async () => {
      await createUserInvite(mockExperimentId);
    }).rejects.toThrow();

    expect(mockUserAccess.grantAccess).not.toHaveBeenCalled();
    expect(mockUserAccess.addToInviteAccess).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
