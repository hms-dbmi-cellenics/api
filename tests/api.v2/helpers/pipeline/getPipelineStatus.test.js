const AWSMock = require('aws-sdk-mock');
const AWS = require('../../../../src/utils/requireAWS');
const constants = require('../../../../src/api.v2/constants');
const { fullHistory, singleIterationHistory, noPodsToDeleteHistory } = require('./getPipelineStatusTestData');
const getPipelineStatus = require('../../../../src/api.v2/helpers/pipeline/getPipelineStatus');
const pipelineConstants = require('../../../../src/api.v2/constants');
const config = require('../../../../src/config');

const ExperimentExecution = require('../../../../src/api.v2/model/ExperimentExecution');

const experimentExecutionInstance = ExperimentExecution();

jest.mock('../../../../src/api.v2/model/ExperimentExecution');

jest.useFakeTimers('modern').setSystemTime(new Date(pipelineConstants.EXPIRED_EXECUTION_DATE).getTime());

const {
  GEM2S_PROCESS_NAME, QC_PROCESS_NAME, SEURAT_PROCESS_NAME,
} = constants;

// these are constants used to indicate to a mocked component whether they should return a
// successful response with data or just an empty one
const SUCCEEDED_ID = 'succeded_id';
const EMPTY_ID = 'empty_id';
// experimentID used to trigger an execution does not exist
const EXECUTION_DOES_NOT_EXIST_ID = 'EXECUTION_DOES_NOT_EXIST';
const EXECUTION_DOES_NOT_EXIST_ID_NOT_MATCHING_PARAMS_HASH = 'EXECUTION_DOES_NOT_EXIST_ID_NOT_MATCHING_PARAMS_HASH';
const EXECUTION_DOES_NOT_EXIST_NULL_SQL_ID = 'EXECUTION_DOES_NOT_EXIST_NULL_SQL';
const RANDOM_EXCEPTION = 'RANDOM_EXCEPTION';

const paramsHash = '44c4c6e190e54c4b2740d37a861bb6954921730cnotASecret';
const notMatchingParamsHash = 'notMatching44c4c6e190e54c4b2740d37a861bb6954921730cnotASecret';

const gem2sStatusResponseSql = {
  [GEM2S_PROCESS_NAME]: {
    startDate: new Date(5),
    stopDate: new Date(5),
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

const qcStatusResponseSql = {
  [QC_PROCESS_NAME]: {
    startDate: new Date(5),
    stopDate: new Date(5),
    status: 'SUCCEEDED',
    completedSteps: [
      'ClassifierFilter',
      'CellSizeDistributionFilter',
      'MitochondrialContentFilter',
      'NumGenesVsNumUmisFilter',
      'DoubletScoresFilter',
      'DataIntegration',
      'ConfigureEmbedding',
    ],
    error: false,
    paramsHash: null,
  },
};

const mockNoRunsResponse = [];

const mockRunResponse = [
  {
    pipelineType: GEM2S_PROCESS_NAME,
    stateMachineArn: SUCCEEDED_ID,
    executionArn: SUCCEEDED_ID,
    paramsHash,
    lastStatusResponse: gem2sStatusResponseSql,
  },
  {
    pipelineType: SEURAT_PROCESS_NAME,
    stateMachineArn: SUCCEEDED_ID,
    executionArn: SUCCEEDED_ID,
    paramsHash,
    lastStatusResponse: statusResponseSql,
  },
  {
    pipelineType: QC_PROCESS_NAME,
    stateMachineArn: SUCCEEDED_ID,
    executionArn: SUCCEEDED_ID,
    paramsHash: null,
    lastStatusResponse: qcStatusResponseSql,
  },
];

const mockExecutionNotExistResponse = [
  {
    pipelineType: GEM2S_PROCESS_NAME,
    stateMachineArn: '',
    executionArn: EXECUTION_DOES_NOT_EXIST_ID,
    paramsHash,
    lastStatusResponse: gem2sStatusResponseSql,
  },
  {
    pipelineType: SEURAT_PROCESS_NAME,
    stateMachineArn: '',
    executionArn: EXECUTION_DOES_NOT_EXIST_ID,
    paramsHash,
    lastStatusResponse: statusResponseSql,
  },
  {
    pipelineType: QC_PROCESS_NAME,
    stateMachineArn: '',
    executionArn: EXECUTION_DOES_NOT_EXIST_ID,
    paramsHash: null,
    lastStatusResponse: qcStatusResponseSql,
  },
];

const mockExecutionNotExistResponseNotMatchingParamsHash = [
  {
    pipelineType: GEM2S_PROCESS_NAME,
    stateMachineArn: '',
    executionArn: EXECUTION_DOES_NOT_EXIST_ID,
    paramsHash: notMatchingParamsHash,
    lastStatusResponse: gem2sStatusResponseSql,
  },
];

const mockExecutionNotExistNullSqlResponse = [
  {
    pipelineType: GEM2S_PROCESS_NAME,
    stateMachineArn: '',
    executionArn: EXECUTION_DOES_NOT_EXIST_ID,
    paramsHash,
    lastStatusResponse: null,
  },
  {
    pipelineType: SEURAT_PROCESS_NAME,
    stateMachineArn: '',
    executionArn: EXECUTION_DOES_NOT_EXIST_ID,
    paramsHash,
    lastStatusResponse: null,
  },
  {
    pipelineType: QC_PROCESS_NAME,
    stateMachineArn: '',
    executionArn: EXECUTION_DOES_NOT_EXIST_ID,
    paramsHash: null,
    lastStatusResponse: null,
  },
];

const mockRandomExceptionResponse = [
  {
    pipelineType: GEM2S_PROCESS_NAME,
    stateMachineArn: '',
    executionArn: RANDOM_EXCEPTION,
    paramsHash,
    lastStatusResponse: gem2sStatusResponseSql,
  },
  {
    pipelineType: SEURAT_PROCESS_NAME,
    stateMachineArn: '',
    executionArn: RANDOM_EXCEPTION,
    paramsHash,
    lastStatusResponse: statusResponseSql,
  },
  {
    pipelineType: QC_PROCESS_NAME,
    stateMachineArn: '',
    executionArn: RANDOM_EXCEPTION,
    paramsHash: null,
    lastStatusResponse: qcStatusResponseSql,
  },
];

describe('getStepsFromExecutionHistory', () => {
  const truncateHistory = (lastEventId) => {
    const lastEventIndex = fullHistory.findIndex((element) => element.id === lastEventId);
    return fullHistory.slice(0, lastEventIndex + 1);
  };

  it('returns empty array if nothing has been completed', () => {
    const events = truncateHistory('19-before-anything-completed');
    const completedSteps = getPipelineStatus.getStepsFromExecutionHistory(events);
    expect(completedSteps).toEqual([]);
  });

  it('returns empty array if any branch has not started', () => {
    const events = truncateHistory('20-one-comlpetion-vs-unstarted');
    const completedSteps = getPipelineStatus.getStepsFromExecutionHistory(events);
    expect(completedSteps).toEqual([]);
  });

  it('returns steps completed in all branches', () => {
    const events = truncateHistory('24-two-completions-vs-one');
    const completedSteps = getPipelineStatus.getStepsFromExecutionHistory(events);
    expect(completedSteps).toEqual(['CellSizeDistributionFilter']);
  });

  it('returns all steps in a finished single-sample execution', () => {
    const completedSteps = getPipelineStatus.getStepsFromExecutionHistory(singleIterationHistory);
    expect(completedSteps).toEqual(['CellSizeDistributionFilter', 'DataIntegration']);
  });

  it('returns all steps in a finished multiple-sample execution', () => {
    const completedSteps = getPipelineStatus.getStepsFromExecutionHistory(fullHistory);
    expect(completedSteps).toEqual(['CellSizeDistributionFilter', 'MitochondrialContentFilter', 'DataIntegration']);
  });

  it('returns all steps in despite having a step with an empty map (no pods to delete)', () => {
    const completedSteps = getPipelineStatus.getStepsFromExecutionHistory(noPodsToDeleteHistory);
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
    const error = getPipelineStatus.checkError(failedEvents);

    expect(error).toEqual({ cause: 'No available and running pipeline pods.', error: 'NoPodsAvailable' });
  });

  it('returns no error for correct execution', () => {
    const error = getPipelineStatus.checkError(events);

    expect(error).toEqual(false);
  });
});


describe('pipelineStatus', () => {
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
      case EXECUTION_DOES_NOT_EXIST_ID:
      case EXECUTION_DOES_NOT_EXIST_NULL_SQL_ID:
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

  beforeEach(() => {
    experimentExecutionInstance.update.mockClear();
    experimentExecutionInstance.find.mockClear();
    experimentExecutionInstance.find.mockImplementation(({ experiment_id: experimentId }) => {
      let response;

      switch (experimentId) {
        case EMPTY_ID:
          response = mockNoRunsResponse;
          break;
        case SUCCEEDED_ID:
          response = mockRunResponse;
          break;
        case EXECUTION_DOES_NOT_EXIST_ID:
          response = mockExecutionNotExistResponse;
          break;
        case EXECUTION_DOES_NOT_EXIST_ID_NOT_MATCHING_PARAMS_HASH:
          response = mockExecutionNotExistResponseNotMatchingParamsHash;
          break;
        case EXECUTION_DOES_NOT_EXIST_NULL_SQL_ID:
          response = mockExecutionNotExistNullSqlResponse;
          break;
        case RANDOM_EXCEPTION:
          response = mockRandomExceptionResponse;
          break;
        default:
          throw new Error(`Unrecognized experiment ID ${experimentId}.`);
      }

      return Promise.resolve(response);
    });
  });

  it('handles properly a gem2s empty sql record', async () => {
    const status = await getPipelineStatus(EMPTY_ID, GEM2S_PROCESS_NAME);

    const expectedStatus = {
      [GEM2S_PROCESS_NAME]: {
        startDate: null,
        stopDate: null,
        error: false,
        status: constants.NOT_CREATED,
        completedSteps: [],
        paramsHash: undefined,
      },
    };

    expect(status).toStrictEqual(expectedStatus);

    expect(experimentExecutionInstance.find).toHaveBeenCalledWith({ experiment_id: EMPTY_ID });

    // sql update is not called
    expect(experimentExecutionInstance.update).not.toHaveBeenCalled();
  });

  it('handles properly a qc empty sql record', async () => {
    const status = await getPipelineStatus(EMPTY_ID, QC_PROCESS_NAME);

    const expectedStatus = {
      [QC_PROCESS_NAME]: {
        startDate: null,
        stopDate: null,
        error: false,
        status: constants.NOT_CREATED,
        completedSteps: [],
      },
    };

    // we don't check with StrictEqual because response will contain
    // undefined paramsHash and that is OK (only needed in gem2s)
    expect(status).toEqual(expectedStatus);

    expect(experimentExecutionInstance.find).toHaveBeenCalledWith({ experiment_id: EMPTY_ID });

    // sql update is not called
    expect(experimentExecutionInstance.update).not.toHaveBeenCalled();
  });

  it('handles a gem2s execution does not exist exception by returning sql last response', async () => {
    const status = await getPipelineStatus(EXECUTION_DOES_NOT_EXIST_ID, GEM2S_PROCESS_NAME);

    expect(status).toEqual(gem2sStatusResponseSql);
    expect(status[GEM2S_PROCESS_NAME].startDate).toBeDefined();
    expect(status[GEM2S_PROCESS_NAME].stopDate).toBeDefined();

    expect(experimentExecutionInstance.find)
      .toHaveBeenCalledWith({ experiment_id: EXECUTION_DOES_NOT_EXIST_ID });

    // sql last_status_response is not updated, couldnt obtain
    expect(experimentExecutionInstance.update).not.toHaveBeenCalled();
  });

  it('if gem2s execution sql last response doesnt match the latest paramsHash, it updates it', async () => {
    const status = await getPipelineStatus(
      EXECUTION_DOES_NOT_EXIST_ID_NOT_MATCHING_PARAMS_HASH, GEM2S_PROCESS_NAME,
    );

    expect(status).toEqual({
      [GEM2S_PROCESS_NAME]: {
        ...gem2sStatusResponseSql[GEM2S_PROCESS_NAME],
        paramsHash: notMatchingParamsHash,
      },
    });
    expect(status[GEM2S_PROCESS_NAME].startDate).toBeDefined();
    expect(status[GEM2S_PROCESS_NAME].stopDate).toBeDefined();

    expect(experimentExecutionInstance.find).toHaveBeenCalledWith(
      { experiment_id: EXECUTION_DOES_NOT_EXIST_ID_NOT_MATCHING_PARAMS_HASH },
    );

    // Updted the execution with the new paramsHash
    expect(experimentExecutionInstance.update).toHaveBeenCalledWith(
      { experiment_id: EXECUTION_DOES_NOT_EXIST_ID_NOT_MATCHING_PARAMS_HASH, pipeline_type: 'gem2s' },
      {
        last_status_response: {
          [GEM2S_PROCESS_NAME]: {
            ...gem2sStatusResponseSql[GEM2S_PROCESS_NAME],
            paramsHash: notMatchingParamsHash,
          },
        },
      },
    );
  });

  it('handles a gem2s execution does not exist exception with hardcoded success if there is no sql value',
    async () => {
      const status = await getPipelineStatus(
        EXECUTION_DOES_NOT_EXIST_NULL_SQL_ID, GEM2S_PROCESS_NAME,
      );

      const expected = {
        [GEM2S_PROCESS_NAME]: {
          startDate: pipelineConstants.EXPIRED_EXECUTION_DATE,
          stopDate: pipelineConstants.EXPIRED_EXECUTION_DATE,
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
      expect(status).toEqual(expected);

      expect(experimentExecutionInstance.find)
        .toHaveBeenCalledWith({ experiment_id: EXECUTION_DOES_NOT_EXIST_NULL_SQL_ID });

      // Updates with mocked response
      expect(experimentExecutionInstance.update).toHaveBeenCalled();
    });

  it('handles a qc execution does not exist exception by returning sql last response', async () => {
    const status = await getPipelineStatus(EXECUTION_DOES_NOT_EXIST_ID, QC_PROCESS_NAME);

    // Returns the sql response
    expect(status).toEqual(qcStatusResponseSql);

    expect(experimentExecutionInstance.find)
      .toHaveBeenCalledWith({ experiment_id: EXECUTION_DOES_NOT_EXIST_ID });

    // Nothing to update in sql
    expect(experimentExecutionInstance.update).not.toHaveBeenCalled();
  });

  it('fails on random exception', async () => {
    await expect(getPipelineStatus(RANDOM_EXCEPTION, QC_PROCESS_NAME)).rejects.toThrow();
  });

  it('handles properly a gem2s sql record', async () => {
    const status = await getPipelineStatus(SUCCEEDED_ID, GEM2S_PROCESS_NAME);

    const expectedStatus = {
      [GEM2S_PROCESS_NAME]: {
        startDate: new Date(0),
        stopDate: new Date(0),
        status: constants.SUCCEEDED,
        paramsHash,
        error: false,
        completedSteps: [],
      },
    };

    expect(status).toStrictEqual(expectedStatus);

    expect(experimentExecutionInstance.find).toHaveBeenCalledWith({ experiment_id: SUCCEEDED_ID });

    // sql last_status_response is updated because it differs
    expect(experimentExecutionInstance.update).toHaveBeenCalledWith(
      { experiment_id: SUCCEEDED_ID, pipeline_type: GEM2S_PROCESS_NAME },
      { last_status_response: expectedStatus },
    );
  });

  it('handles properly a qc sql record', async () => {
    const status = await getPipelineStatus(SUCCEEDED_ID, QC_PROCESS_NAME);

    const expectedStatus = {
      [QC_PROCESS_NAME]: {
        startDate: new Date(0),
        stopDate: new Date(0),
        status: constants.SUCCEEDED,
        error: false,
        completedSteps: [],
        paramsHash: null,
      },
    };

    // we don't check with StrictEqual because response will contain
    // undefined paramsHash and that is OK (only needed in gem2s)
    expect(status).toEqual(expectedStatus);

    expect(experimentExecutionInstance.find).toHaveBeenCalledWith({ experiment_id: SUCCEEDED_ID });

    // sql last_status_response is updated because it differs
    expect(experimentExecutionInstance.update).toHaveBeenCalledWith(
      { experiment_id: SUCCEEDED_ID, pipeline_type: QC_PROCESS_NAME },
      { last_status_response: expectedStatus },
    );
  });


  it('doesn\'t update sql last_status_response if it already matches', async () => {
    const expectedStatus = {
      [GEM2S_PROCESS_NAME]: {
        startDate: new Date(0),
        stopDate: new Date(0),
        status: constants.SUCCEEDED,
        paramsHash,
        error: false,
        completedSteps: [],
      },
    };

    const mockFindResponse = [
      {
        pipelineType: GEM2S_PROCESS_NAME,
        stateMachineArn: SUCCEEDED_ID,
        executionArn: SUCCEEDED_ID,
        paramsHash,
        lastStatusResponse: expectedStatus,
      },
    ];

    experimentExecutionInstance.find.mockImplementation(() => Promise.resolve(mockFindResponse));

    const status = await getPipelineStatus(SUCCEEDED_ID, GEM2S_PROCESS_NAME);

    expect(status).toStrictEqual(expectedStatus);

    expect(experimentExecutionInstance.find).toHaveBeenCalledWith({ experiment_id: SUCCEEDED_ID });

    // sql last_status_response is not updated because it matches
    expect(experimentExecutionInstance.update).not.toHaveBeenCalled();
  });
});
