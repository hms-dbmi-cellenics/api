const config = require('../../../src/config');
const buildUserInvitedEmailBody = require('../../../src/utils/emailTemplates/buildUserInvitedEmailBody');
const { domainSpecificContent } = require('../../../src/config/getDomainSpecificContent');

const testUserEmail = 'test@email.com';
const mockInviterUser = { email: 'inviter@example.com' };
const mockExperimentId = 'mock-experiment-id';

process.env.DOMAIN_NAME = 'localhost.test';

describe('buildUserInvitedEmailBody', () => {
  const accounts = Object.keys(domainSpecificContent)
    .filter((key) => key !== 'test'); // Exclude 'test' as it's not a real account.
  accounts.forEach((account) => {
    describe(`Testing for account ${account}`, () => {
      it('Should build the correct message', () => {
        config.awsAccountId = account;
        const emailParams = buildUserInvitedEmailBody(testUserEmail, mockExperimentId, mockInviterUser);
        expect(emailParams).toMatchSnapshot();
      });
    });
  });
});
