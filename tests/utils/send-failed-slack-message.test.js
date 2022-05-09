const fetchMock = require('jest-fetch-mock');
const { GEM2S_PROCESS_NAME, QC_PROCESS_NAME } = require('../../src/utils/constants');
const sendFailedSlackMessage = require('../../src/utils/send-failed-slack-message');
const { USER } = require('../test-utils/constants');

fetchMock.enableFetchMocks();

jest.mock('../../src/utils/crypt', () => ({
  getWebhookUrl: () => 'http://mockSlackHook.com/asdasd',
}));

const qcStateMachineArn = 'qcArn';
const gem2sStateMachineArn = 'gem2sArn';

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

    await sendFailedSlackMessage(message, USER, QC_PROCESS_NAME, qcStateMachineArn);
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
    await sendFailedSlackMessage(message, USER, GEM2S_PROCESS_NAME, gem2sStateMachineArn);
    expect(fetch.mock.calls).toMatchSnapshot();
  });
});
