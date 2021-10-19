const AWS = require('aws-sdk-mock');
const sendEmailIfNecessary = require('../../src/utils/sendEmailIfNecessary');
const { GEM2S_PROCESS_NAME, SUCCEEDED } = require('../../src/api/general-services/pipeline-manage/constants');
const { USER } = require('../test-utils/constants');

jest.mock('../../src/api/route-services/experiment', () => jest.fn().mockImplementation(() => ({
  getExperimentData: (experimentId) => {
    // mock cannot use variables which are outside the scope
    const subscribedExperiment = 'other-id';
    const unSubscribedExperiment = 'correct-experiment';
    switch (experimentId) {
      case unSubscribedExperiment:
        return { notifyByEmail: false };
      case subscribedExperiment:
        return { notifyByEmail: true };
      default:
        throw new Error('unknown experiment id');
    }
  },
})));

describe('sendEmailIfNecessary', () => {
  const subscribedExperiment = 'other-id';
  const unSubscribedExperiment = 'correct-experiment';
  let sendEmailSpy;
  beforeAll(() => {
    sendEmailSpy = jest.fn(() => Promise.resolve({ data: { MessageId: '200' } }));
    AWS.mock('SES', 'sendEmail', sendEmailSpy);
  });
  it('does not send email if user has not toggled email notification', async () => {
    await sendEmailIfNecessary(GEM2S_PROCESS_NAME, SUCCEEDED, unSubscribedExperiment, USER);
    expect(sendEmailSpy).not.toHaveBeenCalled();
  });
  it('sends email if user has toggled email notification', async () => {
    await sendEmailIfNecessary(GEM2S_PROCESS_NAME, SUCCEEDED, subscribedExperiment, USER);
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
  });
});
