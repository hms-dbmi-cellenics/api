const AWS = require('aws-sdk-mock');
const sendEmail = require('../../src/utils/send-email');
const { GEM2S_PROCESS_NAME, SUCCEEDED, FAILED } = require('../../src/api/general-services/pipeline-manage/constants');
const { USER } = require('../test-utils/constants');

// jest.mock('../../src/api/route-services/experiment', () => jest.fn().mockImplementation(() => ({
//   getExperimentData: (experimentId) => {
//     // mock cannot use variables which are outside the scope
//     const subscribedExperiment = 'other-id';
//     const unSubscribedExperiment = 'correct-experiment';
//     switch (experimentId) {
//       case unSubscribedExperiment:
//         return { notifyByEmail: false };
//       case subscribedExperiment:
//         return { notifyByEmail: true };
//       default:
//         throw new Error('unknown experiment id');
//     }
//   },
// })));
describe('sendEmail', () => {
  const subscribedExperiment = 'other-id';
  const unSubscribedExperiment = 'correct-experiment';
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
    const message = { experiment: subscribedExperiment };
    await sendEmail(message, SUCCEEDED, USER);
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    expect(sendEmailSpy.mock.calls).toMatchSnapshot();
  });
  it('sends failure email', async () => {
    const message = { experiment: subscribedExperiment };
    await sendEmail(message, FAILED, USER);
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    expect(sendEmailSpy.mock.calls).toMatchSnapshot();
  });
});
