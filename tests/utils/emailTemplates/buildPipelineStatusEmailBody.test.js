const { ACCOUNT_ID, SUCCEEDED, FAILED } = require('../../../src/api.v2/constants');
const config = require('../../../src/config');
const buildPipelineStatusEmailBody = require('../../../src/utils/emailTemplates/buildPipelineStatusEmailBody');
const { domainSpecificContent } = require('../../../src/config/getDomainSpecificContent');

const mockExperimentId = 'mock-experiment-id';
const mockUser = {
  name: 'Test User',
  email: 'test@example.com',
};

process.env.DOMAIN_NAME = 'localhost.test';

describe('buildUserInvitedNotRegisteredEmailBody', () => {
  const accounts = Object.keys(domainSpecificContent)
    .filter((key) => key !== 'test'); // Exclude 'test' as it's not a real account.
  accounts.forEach((account) => {
    describe(`Testing for account ${account}`, () => {
      it('Should build the correct message for SUCCEEDED status', () => {
        config.awsAccountId = account;
        const emailParams = buildPipelineStatusEmailBody(mockExperimentId, SUCCEEDED, mockUser);
        expect(emailParams).toMatchSnapshot();
      });

      it('Should build the correct message for FAILED status', () => {
        config.awsAccountId = account;
        const emailParams = buildPipelineStatusEmailBody(mockExperimentId, FAILED, mockUser);
        expect(emailParams).toMatchSnapshot();
      });

      it('Should not show additional retry info for HMS emails', () => {
        config.awsAccountId = account;
        const emailParams = buildPipelineStatusEmailBody(mockExperimentId, FAILED, mockUser);
        expect(emailParams).toMatchSnapshot();
      });
    });
  });
});
