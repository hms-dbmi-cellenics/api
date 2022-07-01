const AWSMock = require('aws-sdk-mock');
const AWS = require('../../../src/utils/requireAWS');
const constants = require('../../../src/api/general-services/pipeline-manage/constants');
const { fullHistory, singleIterationHistory, noPodsToDeleteHistory } = require('./pipeline-status.test.data');
const pipelineStatus = require('../../../src/api/general-services/pipeline-status');
const pipelineConstants = require('../../../src/api/general-services/pipeline-manage/constants');
const config = require('../../../src/config');


const {
  GEM2S_PROCESS_NAME, QC_PROCESS_NAME, OLD_QC_NAME_TO_BE_REMOVED,
} = constants;

// these are constants used to indicate to a mocked component whether they should return a
// successful response with data or just an empty one
const SUCCEEDED_ID = 'succeded_id';
const EMPTY_ID = 'empty_id';
// experimentID used to trigger an execution does not exist
const EXECUTION_DOES_NOT_EXIST = 'EXECUTION_DOES_NOT_EXIST';
const RANDOM_EXCEPTION = 'RANDOM_EXCEPTION';

const paramsHash = '44c4c6e190e54c4b2740d37a861bb6954921730cnotASecret';

const mockNotRunResponse = {
  Item: {
    meta: {
      M: {
        [GEM2S_PROCESS_NAME]: {
          M: {
            stateMachineArn: {
              S: EMPTY_ID,
            },
            executionArn: {
              S: '',
            },
            paramsHash: {
              S: '',
            },
          },
        },
        [OLD_QC_NAME_TO_BE_REMOVED]: {
          M: {
            stateMachineArn: {
              S: EMPTY_ID,
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

const mockRunResponse = {
  Item: {
    meta: {
      M: {
        [GEM2S_PROCESS_NAME]: {
          M: {
            stateMachineArn: {
              S: SUCCEEDED_ID,
            },
            executionArn: {
              S: SUCCEEDED_ID,
            },
            paramsHash: {
              S: paramsHash,
            },
          },
        },
        [OLD_QC_NAME_TO_BE_REMOVED]: {
          M: {
            stateMachineArn: {
              S: SUCCEEDED_ID,
            },
            executionArn: {
              S: SUCCEEDED_ID,
            },
          },
        },
      },
    },
  },
};

const mockExecutionNotExistResponse = {
  Item: {
    meta: {
      M: {
        [GEM2S_PROCESS_NAME]: {
          M: {
            stateMachineArn: {
              S: '',
            },
            executionArn: {
              S: EXECUTION_DOES_NOT_EXIST,
            },
            paramsHash: {
              S: paramsHash,
            },
          },
        },
        [OLD_QC_NAME_TO_BE_REMOVED]: {
          M: {
            stateMachineArn: {
              S: '',
            },
            executionArn: {
              S: EXECUTION_DOES_NOT_EXIST,
            },
          },
        },
      },
    },
  },
};
const mockRandomExceptionResponse = {
  Item: {
    meta: {
      M: {
        [GEM2S_PROCESS_NAME]: {
          M: {
            stateMachineArn: {
              S: '',
            },
            executionArn: {
              S: RANDOM_EXCEPTION,
            },
            paramsHash: {
              S: paramsHash,
            },
          },
        },
        [OLD_QC_NAME_TO_BE_REMOVED]: {
          M: {
            stateMachineArn: {
              S: '',
            },
            executionArn: {
              S: RANDOM_EXCEPTION,
            },
          },
        },
      },
    },
  },
};

jest.useFakeTimers('modern').setSystemTime(new Date('2020-01-01').getTime());

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

describe('checkError', () => {
  const events = [
    {
      timestamp: {
      },
      type: 'TaskStateEntered',
      id: 2,
      previousEventId: 0,
      stateEnteredEventDetails: {
        name: 'DeleteCompletedPipelineWorker',
        input: null,
      },
    },
    {
      timestamp: {
      },
      type: 'TaskScheduled',
      id: 3,
      previousEventId: 2,
      taskScheduledEventDetails: {
        resourceType: 'lambda',
        resource: 'invoke',
        region: 'eu-west-1',
        parameters: '{"FunctionName":"arn:aws:lambda:eu-west-1:000000000000:function:remove-previous-pipeline-containers"}',
        timeoutInSeconds: null,
        heartbeatInSeconds: null,
      },
    },
  ];
  const failedEvents = [
    {
      timestamp: '2021-10-13T14:36:14.228000+02:00',
      type: 'ExecutionFailed',
      id: 130,
      previousEventId: 129,
      executionFailedEventDetails: {
        error: 'NoPodsAvailable',
        cause: 'No available and running pipeline pods.',
      },
    },
  ];

  it('returns an error for a failed execution', () => {
    const error = pipelineStatus.checkError(failedEvents);

    expect(error).toEqual({ cause: 'No available and running pipeline pods.', error: 'NoPodsAvailable' });
  });

  it('returns no error for correct execution', () => {
    const error = pipelineStatus.checkError(events);

    expect(error).toEqual(false);
  });
});


describe('pipelineStatus', () => {
  AWSMock.mock('DynamoDB', 'getItem', (params, callback) => {
    const experimentId = params.Key.experimentId.S;
    switch (experimentId) {
      case EMPTY_ID:
        callback(null, mockNotRunResponse);
        break;
      case SUCCEEDED_ID:
        callback(null, mockRunResponse);
        break;
      case EXECUTION_DOES_NOT_EXIST:
        callback(null, mockExecutionNotExistResponse);
        break;
      case RANDOM_EXCEPTION:
        callback(null, mockRandomExceptionResponse);
        break;
      default:
        throw new Error(`Unrecognized experiment ID ${experimentId}.`);
    }
  });

  const mockDynamoGetItem = jest.fn().mockImplementation(() => ({
    Item: AWS.DynamoDB.Converter.marshall({
      meta: {},
      samples: {
        ids: [],
      },
    }),
  }));

  AWSMock.setSDKInstance(AWS);

  AWSMock.mock('StepFunctions', 'describeExecution', (params, callback) => {
    const successfulExecution = {
      stateMachineArn: `arn:aws:states:eu-west-1:${config.awsAccountId}:execution:biomage-gem2s-development-11111444448882220044as80023023942342311`,
      startDate: new Date(0),
      stopDate: new Date(0),
      status: constants.SUCCEEDED,
      error: true,
      paramsHash,
    };
    const emptyExecution = {};
    const errDoesNotExist = new Error(pipelineConstants.EXECUTION_DOES_NOT_EXIST);
    errDoesNotExist.code = pipelineConstants.EXECUTION_DOES_NOT_EXIST;

    const { executionArn } = params;
    switch (executionArn) {
      case SUCCEEDED_ID:
        callback(null, successfulExecution);
        break;
      case EMPTY_ID:
        callback(null, emptyExecution);
        break;
      case EXECUTION_DOES_NOT_EXIST:
        throw errDoesNotExist;
      default:
        throw new Error(`Unexpected executionArn ${executionArn}`);
    }

    callback(null, params);
  });

  AWSMock.mock('StepFunctions', 'getExecutionHistory', (params, callback) => {
    callback(null, { events: [] });
  });

  beforeAll(() => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(new Date(2020, 3, 1));
  });


  it('handles properly a gem2s empty dynamodb record', async () => {
    const status = await pipelineStatus(EMPTY_ID, GEM2S_PROCESS_NAME);

    expect(status).toStrictEqual({
      [GEM2S_PROCESS_NAME]: {
        startDate: null,
        stopDate: null,
        error: false,
        status: constants.NOT_CREATED,
        completedSteps: [],
        paramsHash: undefined,
      },
    });

    expect(mockDynamoGetItem).not.toHaveBeenCalled();
  });

  it('handles properly a qc empty dynamodb record', async () => {
    const status = await pipelineStatus(EMPTY_ID, QC_PROCESS_NAME);

    // we don't check with StrictEqual because response will contain
    // undefined paramsHash and that is OK (only needed in gem2s)
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

  it('handles a gem2s execution does not exist exception', async () => {
    const status = await pipelineStatus(EXECUTION_DOES_NOT_EXIST, GEM2S_PROCESS_NAME);

    const expected = {
      [GEM2S_PROCESS_NAME]: {
        status: 'SUCCEEDED',
        completedSteps: [
          'DownloadGem',
          'PreProcessing',
          'EmptyDrops',
          'DoubletScores',
          'CreateSeurat',
          'PrepareExperiment',
          'UploadToAWS'],
        error: false,
        paramsHash,
      },
    };
    expect(status).toEqual(expect.not.objectContaining(expected));
    expect(status[GEM2S_PROCESS_NAME].startDate).toBeDefined();
    expect(status[GEM2S_PROCESS_NAME].stopDate).toBeDefined();

    expect(mockDynamoGetItem).not.toHaveBeenCalled();
  });

  it('handles a qc execution does not exist exception', async () => {
    const status = await pipelineStatus(EXECUTION_DOES_NOT_EXIST, QC_PROCESS_NAME);

    const ninetyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 90));
    const expected = {
      [QC_PROCESS_NAME]: {
        startDate: ninetyDaysAgo,
        stopDate: ninetyDaysAgo,
        status: 'SUCCEEDED',
        completedSteps: [
          'ClassifierFilter',
          'CellSizeDistributionFilter',
          'MitochondrialContentFilter',
          'NumGenesVsNumUmisFilter',
          'DoubletScoresFilter',
          'DataIntegration',
          'ConfigureEmbedding'],
        error: false,
      },
    };
    expect(status).toEqual(expected);

    expect(mockDynamoGetItem).not.toHaveBeenCalled();
  });

  it('fails on random exception', async () => {
    await expect(pipelineStatus(RANDOM_EXCEPTION, QC_PROCESS_NAME)).rejects.toThrow();
  });

  it('handles properly a gem2s dynamodb record', async () => {
    const status = await pipelineStatus(SUCCEEDED_ID, GEM2S_PROCESS_NAME);

    expect(status).toStrictEqual({
      [GEM2S_PROCESS_NAME]: {
        startDate: new Date(0),
        stopDate: new Date(0),
        status: constants.SUCCEEDED,
        paramsHash,
        error: false,
        completedSteps: [],
      },
    });

    expect(mockDynamoGetItem).not.toHaveBeenCalled();
  });

  it('handles properly a qc dynamodb record', async () => {
    const status = await pipelineStatus(SUCCEEDED_ID, QC_PROCESS_NAME);

    // we don't check with StrictEqual because response will contain
    // undefined paramsHash and that is OK (only needed in gem2s)
    expect(status).toEqual({
      [QC_PROCESS_NAME]: {
        startDate: new Date(0),
        stopDate: new Date(0),
        status: constants.SUCCEEDED,
        error: false,
        completedSteps: [],
      },
    });

    expect(mockDynamoGetItem).not.toHaveBeenCalled();
  });
});
