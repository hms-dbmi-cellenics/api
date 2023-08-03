const { ACCOUNT_ID, SUCCEEDED, FAILED } = require('../../../src/api.v2/constants');
const config = require('../../../src/config');
const buildPipelineStatusEmailBody = require('../../../src/utils/emailTemplates/buildPipelineStatusEmailBody');

const mockExperimentId = 'mock-experiment-id';
const mockUser = {
  name: 'Test User',
  email: 'test@example.com',
};

process.env.DOMAIN_NAME = 'localhost.test';

describe('buildUserInvitedNotRegisteredEmailBody', () => {
  it('Should build the correct message for SUCCEEDED status', () => {
    const emailParams = buildPipelineStatusEmailBody(mockExperimentId, SUCCEEDED, mockUser);
    expect(emailParams).toMatchSnapshot();
  });
  it('Should build the correct message for FAILED status', () => {
    const emailParams = buildPipelineStatusEmailBody(mockExperimentId, FAILED, mockUser);
    expect(emailParams).toMatchSnapshot();
  });
});
