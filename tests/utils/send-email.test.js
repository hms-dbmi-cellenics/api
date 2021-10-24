const AWS = require('aws-sdk-mock');
const sendEmail = require('../../src/utils/send-email');
const { SUCCEEDED, FAILED } = require('../../src/api/general-services/pipeline-manage/constants');
const { USER } = require('../test-utils/constants');

describe('sendEmail', () => {
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
    await sendEmail(message, SUCCEEDED, USER);
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    expect(sendEmailSpy.mock.calls).toMatchSnapshot();
  });
  it('sends failure email', async () => {
    const message = { experiment: experimentId };
    await sendEmail(message, FAILED, USER);
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    expect(sendEmailSpy.mock.calls).toMatchSnapshot();
  });
});
