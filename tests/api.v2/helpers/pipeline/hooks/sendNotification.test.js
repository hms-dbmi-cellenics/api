const fetchMock = require('jest-fetch-mock');

const sendNotification = require('../../../../../src/api.v2/helpers/pipeline/hooks/sendNotification');

const Experiment = require('../../../../../src/api.v2/model/Experiment');

const getPipelineStatus = require('../../../../../src/api.v2/helpers/pipeline/getPipelineStatus');

const { FAILED, SUCCEEDED } = require('../../../../../src/api.v2/constants');

const sendFailedSlackMessage = require('../../../../../src/utils/send-failed-slack-message');
const sendEmail = require('../../../../../src/utils/sendEmail');

jest.mock('../../../../../src/api.v2/middlewares/authMiddlewares', () => ({
  authenticationMiddlewareSocketIO: () => ({
    name: 'FirstName LastName',
    email: 'mockEmail@email.lol',
  }),
}));
jest.mock('../../../../../src/api.v2/model/Experiment');
jest.mock('../../../../../src/api.v2/helpers/pipeline/getPipelineStatus');
jest.mock('../../../../../src/utils/send-failed-slack-message', () => jest.fn());
jest.mock('../../../../../src/utils/sendEmail', () => jest.fn());

const experimentInstance = new Experiment();
fetchMock.enableFetchMocks();

const pipelines = {
  qc: {
    stateMachineArn: 'qcArn',
  },
  gem2s: {
    stateMachineArn: 'gem2sArn',
  },
  seurat: {
    stateMachineArn: 'seuratArn',
  },
};

describe('sendNotification ', () => {
  const message = {
    experimentId: 'mockexp',
    input: {
      authJWT: 'somejwt',
      processName: 'gem2s',
      taskName: 'task1',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    fetchMock.mockResponse(JSON.stringify({ ok: true }));
    sendFailedSlackMessage.mockReset();
    sendEmail.mockReset();
  });

  it('Sends slack notification on failed process', async () => {
    experimentInstance.getExperimentData.mockReturnValue({ notifyByEmail: false, pipelines });

    getPipelineStatus.mockReturnValue({
      gem2s: {
        status: FAILED,
      },
    });
    await sendNotification(message);
    expect(sendFailedSlackMessage).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledTimes(0);
  });

  it('Sends email and slack message if user toggled notifications on failed QC process', async () => {
    experimentInstance.getExperimentData.mockReturnValue({ notifyByEmail: true, pipelines });

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

  it('Sends email and slack message if user toggled notifications on failed Seurat process', async () => {
    experimentInstance.getExperimentData.mockReturnValue({ notifyByEmail: true, pipelines });

    const newMessage = {
      ...message,
      input: {
        ...message.input,
        processName: 'seurat',
      },
    };

    getPipelineStatus.mockReturnValue({
      seurat: {
        status: FAILED,
      },
    });

    await sendNotification(newMessage);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendFailedSlackMessage).toHaveBeenCalledTimes(1);
  });

  it('Sends email on QC success if toggled, does not send slack message ', async () => {
    experimentInstance.getExperimentData.mockReturnValue({ notifyByEmail: true, pipelines });
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

  it('Sends email on Seurat success if toggled, does not send slack message ', async () => {
    experimentInstance.getExperimentData.mockReturnValue({ notifyByEmail: true, pipelines });
    const newMessage = {
      ...message,
      input: {
        ...message.input,
        processName: 'seurat',
      },
    };
    getPipelineStatus.mockReturnValue({
      seurat: {
        status: SUCCEEDED,
      },
    });
    await sendNotification(newMessage);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendFailedSlackMessage).toHaveBeenCalledTimes(0);
  });

  it('Does not send email on QC success if user has not toggled notifications', async () => {
    experimentInstance.getExperimentData.mockReturnValue({ notifyByEmail: false, pipelines });
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

  it('Does not send email on Seurat success if user has not toggled notifications', async () => {
    experimentInstance.getExperimentData.mockReturnValue({ notifyByEmail: false, pipelines });
    const newMessage = {
      ...message,
      input: {
        ...message.input,
        processName: 'seurat',
      },
    };
    getPipelineStatus.mockReturnValue({
      seurat: {
        status: SUCCEEDED,
      },
    });
    await sendNotification(newMessage);
    expect(sendEmail).toHaveBeenCalledTimes(0);
    expect(sendFailedSlackMessage).toHaveBeenCalledTimes(0);
  });
});
