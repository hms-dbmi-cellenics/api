const { ACCOUNT_ID } = require('../../../src/api.v2/constants');
const config = require('../../../src/config');
const buildUserInvitedNotRegisteredEmailBody = require('../../../src/utils/emailTemplates/buildUserInvitedNotRegisteredEmailBody');

const testUserEmail = 'test@email.com';
const mockInviterUser = { email: 'inviter@example.com' };

process.env.DOMAIN_NAME = 'localhost.test';

describe('buildUserInvitedNotRegisteredEmailBody', () => {
  it('Should build the correct message', () => {
    const emailParams = buildUserInvitedNotRegisteredEmailBody(testUserEmail, mockInviterUser);
    expect(emailParams).toMatchSnapshot();
  });

  it('Should build the correct message for HMS', () => {
    config.awsAccountId = ACCOUNT_ID.HMS;

    const emailParams = buildUserInvitedNotRegisteredEmailBody(testUserEmail, mockInviterUser);
    expect(emailParams).toMatchSnapshot();
  });
});
