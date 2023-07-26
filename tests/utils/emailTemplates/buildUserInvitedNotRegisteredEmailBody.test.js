const config = require('../../../src/config');
const buildUserInvitedNotRegisteredEmailBody = require('../../../src/utils/emailTemplates/buildUserInvitedNotRegisteredEmailBody');
const { domainSpecificContent } = require('../../../src/config/getDomainSpecificContent');

const testUserEmail = 'test@email.com';
const mockInviterUser = { email: 'inviter@example.com' };

process.env.DOMAIN_NAME = 'localhost.test';

describe('buildUserInvitedNotRegisteredEmailBody', () => {
  const accounts = Object.keys(domainSpecificContent)
    .filter((key) => key !== 'test'); // Exclude 'test' as it's not a real account.
  accounts.forEach((account) => {
    describe(`Testing for account ${account}`, () => {
      it('Should build the correct message', () => {
        config.awsAccountId = account;
        const emailParams = buildUserInvitedNotRegisteredEmailBody(testUserEmail, mockInviterUser);
        expect(emailParams).toMatchSnapshot();
      });
    });
  });
});
