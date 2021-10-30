const sendNotification = require('../../../src/utils/hooks/send-notification');
const getPipelineStatus = require('../../../src/api/general-services/pipeline-status');
const { FAILED, SUCCEEDED } = require('../../../src/api/general-services/pipeline-manage/constants');
const sendFailedSlackMessage = require('../../../src/utils/send-failed-slack-message');
const sendEmail = require('../../../src/utils/send-email');
const ExperimentService = require('../../../src/api/route-services/experiment');

jest.mock('../../../src/utils/authMiddlewares');
jest.mock('../../../src/api/route-services/experiment');
jest.mock('../../../src/api/general-services/pipeline-status');
jest.mock('../../../src/utils/send-failed-slack-message', () => jest.fn());
jest.mock('../../../src/utils/send-email', () => jest.fn());

const experimentsService = new ExperimentService();
describe('send-notification ', () => {
  const message = {
    experimentId: 'mockexp',
    input: {
      authJWT: 'somejwt',
      processName: 'gem2s',
      taskName: 'task1',
    },
  };

  global.fetch = jest.fn(() => Promise.resolve({ ok: true }));

  beforeEach(() => {
    sendFailedSlackMessage.mockReset();
    sendEmail.mockReset();
  });

  it('Sends slack notification on failed process', async () => {
    getPipelineStatus.mockReturnValue({
      gem2s: {
        status: FAILED,
      },
    });
    await sendNotification(message);
    expect(sendFailedSlackMessage).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledTimes(0);
  });

  it('Sends email and slack message if user toggled notifications on failed process', async () => {
    experimentsService.getExperimentData.mockReturnValue({
      notifyByEmail: true,
    });
    const newMessage = {
      ...message,
      input: {
        ...message.input,
        processName: 'qc',
      },
    };
    getPipelineStatus.mockReturnValue({
      qc: {
        status: FAILED,
      },
    });
    await sendNotification(newMessage);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendFailedSlackMessage).toHaveBeenCalledTimes(1);
  });

  it('Sends email on success if toggled, does not send slack message ', async () => {
    experimentsService.getExperimentData.mockReturnValue({
      notifyByEmail: true,
    });
    const newMessage = {
      ...message,
      input: {
        ...message.input,
        processName: 'qc',
      },
    };
    getPipelineStatus.mockReturnValue({
      qc: {
        status: SUCCEEDED,
      },
    });
    await sendNotification(newMessage);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendFailedSlackMessage).toHaveBeenCalledTimes(0);
  });

  it('Does not send email on success if user has not toggled notifications', async () => {
    experimentsService.getExperimentData.mockReturnValue({
      notifyByEmail: false,
    });
    const newMessage = {
      ...message,
      input: {
        ...message.input,
        processName: 'qc',
      },
    };
    getPipelineStatus.mockReturnValue({
      qc: {
        status: SUCCEEDED,
      },
    });
    await sendNotification(newMessage);
    expect(sendEmail).toHaveBeenCalledTimes(0);
    expect(sendFailedSlackMessage).toHaveBeenCalledTimes(0);
  });
});
