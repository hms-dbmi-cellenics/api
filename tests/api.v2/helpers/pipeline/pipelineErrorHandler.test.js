const { GEM2S_PROCESS_NAME } = require('../../../../src/api.v2/constants');

const pipelineErrorHandler = require('../../../../src/api.v2/helpers/pipeline/pipelineErrorHandler');
const getPipelineStatus = require('../../../../src/api.v2/helpers/pipeline/getPipelineStatus');

const sendNotification = require('../../../../src/api.v2/helpers/pipeline/hooks/sendNotification');

jest.mock('../../../../src/api.v2/helpers/pipeline/hooks/sendNotification');
jest.mock('../../../../src/api.v2/helpers/pipeline/getPipelineStatus');

const ioEmitSpy = jest.fn();

const mockExperimentId = 'mockExperimentId';
const processName = GEM2S_PROCESS_NAME;

const mockIo = {
  sockets: {
    emit: ioEmitSpy,
  },
};


const mockParsedErrorMessage = {
  taskName: 'pipelineError',
  experimentId: mockExperimentId,
  apiUrl: 'https://mock-sandbox-id.biomage.net',
  input: {
    authJWT: 'Bearer mockBearerToken',
    experimentId: mockExperimentId,
    error: 'TIMED_OUT',
    taskName: 'pipelineError',
    sandboxId: 'mock-sandbox-id',
    activityId: 'pipeline-mock-activity-id',
    processName,
  },
};

describe('pipelineErrorHandler', () => {
  it('Handles error correctly', async () => {
    await pipelineErrorHandler(mockIo, mockParsedErrorMessage);

    const [wsChannel, wsPayload] = ioEmitSpy.mock.calls[0];

    expect(ioEmitSpy).toHaveBeenCalledTimes(1);
    expect(getPipelineStatus).toHaveBeenCalledTimes(1);
    expect(getPipelineStatus).toHaveBeenCalledWith(mockExperimentId, processName);

    expect(wsChannel).toEqual(`ExperimentUpdates-${mockExperimentId}`);
    expect(wsPayload).toMatchSnapshot();

    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(sendNotification).toHaveBeenCalledWith(mockParsedErrorMessage);
  });
});
