const { ACCOUNT_ID } = require('../../../src/api.v2/constants');
const config = require('../../../src/config');
const buildUserInvitedEmailBody = require('../../../src/utils/emailTemplates/buildUserInvitedEmailBody');

const testUserEmail = 'test@email.com';
const mockInviterUser = { email: 'inviter@example.com' };
const mockExperimentId = 'mock-experiment-id';

describe('buildUserInvitedNotRegisteredEmailBody', () => {
  it('Should build the correct message', () => {
    const emailParams = buildUserInvitedEmailBody(testUserEmail, mockExperimentId, mockInviterUser);
    expect(emailParams).toMatchSnapshot();
  });

  it('Should build the correct message for HMS', () => {
    config.awsAccountId = ACCOUNT_ID.HMS;

    const emailParams = buildUserInvitedEmailBody(testUserEmail, mockExperimentId, mockInviterUser);
    expect(emailParams).toMatchSnapshot();
  });
});
