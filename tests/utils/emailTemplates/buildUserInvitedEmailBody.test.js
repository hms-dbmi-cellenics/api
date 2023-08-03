const buildUserInvitedEmailBody = require('../../../src/utils/emailTemplates/buildUserInvitedEmailBody');

const testUserEmail = 'test@email.com';
const mockInviterUser = { email: 'inviter@example.com' };
const mockExperimentId = 'mock-experiment-id';

process.env.DOMAIN_NAME = 'localhost.test';

describe('buildUserInvitedEmailBody', () => {
  it('Should build the correct message', () => {
    const emailParams = buildUserInvitedEmailBody(testUserEmail, mockExperimentId, mockInviterUser);
    expect(emailParams).toMatchSnapshot();
  });
});
