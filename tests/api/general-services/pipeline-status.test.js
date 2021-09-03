const AWSMock = require('aws-sdk-mock');
const AWS = require('../../../src/utils/requireAWS');
const constants = require('../../../src/api/general-services/pipeline-manage/constants');
const { fullHistory, singleIterationHistory, noPodsToDeleteHistory } = require('./pipeline-status.test.data');
const pipelineStatus = require('../../../src/api/general-services/pipeline-status');

const {
  GEM2S_PROCESS_NAME, QC_PROCESS_NAME, OLD_QC_NAME_TO_BE_REMOVED,
} = constants;

describe('getStepsFromExecutionHistory', () => {
  const truncateHistory = (lastEventId) => {
    const lastEventIndex = fullHistory.findIndex((element) => element.id === lastEventId);
    return fullHistory.slice(0, lastEventIndex + 1);
  };

  it('returns empty array if nothing has been completed', () => {
    const events = truncateHistory('19-before-anything-completed');
    const completedSteps = pipelineStatus.getStepsFromExecutionHistory(events);
    expect(completedSteps).toEqual([]);
  });

  it('returns empty array if any branch has not started', () => {
    const events = truncateHistory('20-one-comlpetion-vs-unstarted');
    const completedSteps = pipelineStatus.getStepsFromExecutionHistory(events);
    expect(completedSteps).toEqual([]);
  });

  it('returns steps completed in all branches', () => {
    const events = truncateHistory('24-two-completions-vs-one');
    const completedSteps = pipelineStatus.getStepsFromExecutionHistory(events);
    expect(completedSteps).toEqual(['CellSizeDistributionFilter']);
  });

  it('returns all steps in a finished single-sample execution', () => {
    const completedSteps = pipelineStatus.getStepsFromExecutionHistory(singleIterationHistory);
    expect(completedSteps).toEqual(['CellSizeDistributionFilter', 'DataIntegration']);
  });

  it('returns all steps in a finished multiple-sample execution', () => {
    const completedSteps = pipelineStatus.getStepsFromExecutionHistory(fullHistory);
    expect(completedSteps).toEqual(['CellSizeDistributionFilter', 'MitochondrialContentFilter', 'DataIntegration']);
  });

  it('returns all steps in despite having a step with an empty map (no pods to delete)', () => {
    const completedSteps = pipelineStatus.getStepsFromExecutionHistory(noPodsToDeleteHistory);
    expect(completedSteps).toEqual(['MitochondrialContentFilter', 'ClassifierFilter', 'CellSizeDistributionFilter']);
  });
});

describe('pipelineStatus', () => {
  const mockNotRunResponse = {
    Item: {
      meta: {
        M: {
          [GEM2S_PROCESS_NAME]: {
            M: {
              stateMachineArn: {
                S: '',
              },
              executionArn: {
                S: '',
              },
            },
          },
          [OLD_QC_NAME_TO_BE_REMOVED]: {
            M: {
              stateMachineArn: {
                S: '',
              },
              executionArn: {
                S: '',
              },
            },
          },
        },
      },
    },

  };

  const mockDescribeExecution = jest.fn();

  const mockDynamoGetItem = jest.fn().mockImplementation(() => ({
    Item: AWS.DynamoDB.Converter.marshall({
      // Dumb meaningless payload to prevent crahes
      meta: {},
      samples: {
        ids: [],
      },
    }),
  }));

  beforeEach(() => {
    AWSMock.setSDKInstance(AWS);

    AWSMock.mock('StepFunctions', 'describeExecution', (params, callback) => {
      callback(null, mockDescribeExecution(params));
    });

    AWSMock.mock('StepFunctions', 'getExecutionHistory', (params, callback) => {
      callback(null, { events: [] });
    });

    const getPipelineHandleSpy = jest.fn((x) => x);
    AWSMock.mock('DynamoDB', 'getItem', (params, callback) => {
      getPipelineHandleSpy(params);
      callback(null, mockNotRunResponse);
    });
  });

  it('handles properly an empty dynamodb record', async () => {
    const status = await pipelineStatus('1234', QC_PROCESS_NAME);

    expect(status).toEqual({
      [QC_PROCESS_NAME]: {
        startDate: null,
        stopDate: null,
        error: false,
        status: constants.NOT_CREATED,
        completedSteps: [],
      },
    });

    expect(mockDynamoGetItem).not.toHaveBeenCalled();
  });
});
