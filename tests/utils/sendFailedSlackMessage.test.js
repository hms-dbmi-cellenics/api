// const fetchMock = require('jest-fetch-mock');
// const fetch = require('node-fetch');
const sendFailedSlackMessage = require('../../src/utils/sendFailedSlackMessage');
const { USER } = require('../test-utils/constants');

jest.mock('../../src/api/route-services/experiment', () => jest.fn().mockImplementation(() => ({
  getExperimentData: () => ({
    meta: {
      pipeline: {
        stateMachineArn: 'qcArn',
      },
      gem2s: {
        stateMachineArn: 'gem2sArn',
      },
    },
  }),
})));
global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
describe('sendFailedSlackMessage', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('Sends slack message with correct fields for QC', async () => {
    const message = {
      input: {
        processName: 'qc',
        taskName: 'Task 1',
      },
      experimentId: 'asd123',
    };

    await sendFailedSlackMessage(message, USER);
    expect(fetch.mock.calls).toMatchSnapshot();
  });

  it('Sends slack message with correct fields for Gem2s', async () => {
    const message = {
      input: {
        processName: 'gem2s',
        taskName: 'someStep',
      },
      experimentId: 'anotherExpId',
    };
    await sendFailedSlackMessage(message, USER);
    expect(fetch.mock.calls).toMatchSnapshot();
  });
});
