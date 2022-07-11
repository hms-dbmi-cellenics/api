const AWS = require('aws-sdk-mock');
const sendEmail = require('../../src/utils/sendEmail');
const { SUCCEEDED, FAILED } = require('../../src/api.v2/helpers/pipeline/constants');
const { USER } = require('../test-utils/constants');
const buildPipelineStatusEmailBody = require('../../src/utils/emailTemplates/buildPipelineStatusEmailBody');

describe('sending email works', () => {
  const experimentId = 'other-id';
  let sendEmailSpy;
  beforeAll(() => {
    jest.resetModules();
    jest.clearAllMocks();
    sendEmailSpy = jest.fn(() => Promise.resolve({ data: { MessageId: '200' } }));
    AWS.mock('SES', 'sendEmail', sendEmailSpy);
  });
  beforeEach(() => {
    sendEmailSpy.mockReset();
  });

  it('sends success email', async () => {
    const message = { experiment: experimentId };
    const params = buildPipelineStatusEmailBody(message.experiment, SUCCEEDED, USER);
    sendEmail(params);
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    expect(sendEmailSpy.mock.calls).toMatchSnapshot();
  });
  it('sends failure email', async () => {
    const message = { experiment: experimentId };
    const params = buildPipelineStatusEmailBody(message.experiment, FAILED, USER);
    sendEmail(params);
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    expect(sendEmailSpy.mock.calls).toMatchSnapshot();
  });
});
