const fetchMock = require('jest-fetch-mock');
const sendFailedSlackMessage = require('../../src/utils/send-failed-slack-message');
const { USER } = require('../test-utils/constants');

fetchMock.enableFetchMocks();

jest.mock('../../src/utils/crypt', () => ({
  getWebhookUrl: () => 'http://mockSlackHook.com/asdasd',
}));
const experiment = {
  meta: {
    pipeline: {
      stateMachineArn: 'qcArn',
    },
    gem2s: {
      stateMachineArn: 'gem2sArn',
    },
  },
};

describe('sendFailedSlackMessage', () => {
  beforeEach(() => {
    fetch.mockClear();
    fetchMock.mockResponse(JSON.stringify({ ok: true }));
  });

  it('Sends slack message with correct fields for QC', async () => {
    const message = {
      input: {
        processName: 'qc',
        taskName: 'Task 1',
        authJWT: 'lmao',
      },
      experimentId: 'asd123',
    };

    await sendFailedSlackMessage(message, USER, experiment);
    expect(fetch.mock.calls).toMatchSnapshot();
  });

  it('Sends slack message with correct fields for Gem2s', async () => {
    const message = {
      input: {
        processName: 'gem2s',
        taskName: 'someStep',
        authJWT: 'lmao',
      },
      experimentId: 'anotherExpId',
    };
    await sendFailedSlackMessage(message, USER, experiment);
    expect(fetch.mock.calls).toMatchSnapshot();
  });
});
