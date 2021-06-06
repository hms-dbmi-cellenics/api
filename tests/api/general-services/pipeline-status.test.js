const AWSMock = require('aws-sdk-mock');
const AWS = require('../../../src/utils/requireAWS');
const constants = require('../../../src/api/general-services/pipeline-manage/constants');
const experimentHelpers = require('../../../src/api/route-services/experimentHelpers');

const getExperimentAttributesSpy = jest.spyOn(experimentHelpers, 'getExperimentAttributes');

const pipelineStatus = require('../../../src/api/general-services/pipeline-status');
const ProjectService = require('../../../src/api/route-services/projects');

describe('getStepsFromExecutionHistory', () => {
  const fullHistory = [
    {
      type: 'ExecutionStarted',
      id: 1,
      previousEventId: 0,
    },
    {
      type: 'Dummy',
      id: 'dummy-state-having-zero-as-previous',
      previousEventId: 0,
    },
    {
      type: 'MapStateEntered',
      id: 12,
      previousEventId: 'dummy-state-having-zero-as-previous',
      stateEnteredEventDetails: {
        name: 'Filters',
      },
    },
    {
      type: 'MapStateStarted',
      id: 13,
      previousEventId: 12,
      mapStateStartedEventDetails: {
        length: 2,
      },
    },
    {
      type: 'MapIterationStarted',
      id: 14,
      previousEventId: 13,
      mapIterationStartedEventDetails: {
        name: 'Filters',
        index: 0,
      },
    },
    {
      // Iteration 0
      type: 'TaskStateEntered',
      id: 15,
      previousEventId: 14,
      stateEnteredEventDetails: {
        name: 'CellSizeDistributionFilter',
      },
    },
    {
      // Iteration 0
      type: 'TaskSucceeded',
      id: 16,
      previousEventId: 15,
    },
    {
      // Iteration 0
      type: 'TaskStateExited',
      id: 17,
      previousEventId: 16,
      stateExitedEventDetails: {
        name: 'CellSizeDistributionFilter',
      },
    },
    {
      type: 'MapIterationStarted',
      id: 18,
      previousEventId: 13,
      mapIterationStartedEventDetails: {
        name: 'Filters',
        index: 1,
      },
    },
    {
      // Iteration 0
      type: 'TaskStateEntered',
      id: '19-before-anything-completed',
      previousEventId: 17,
      stateEnteredEventDetails: {
        name: 'MitochondrialContentFilter',
      },
    },
    {
      // Iteration 0
      type: 'TaskSucceeded',
      id: '20-one-comlpetion-vs-unstarted',
      previousEventId: '19-before-anything-completed',
    },
    {
      // Iteration 1
      type: 'TaskStateEntered',
      id: 21,
      previousEventId: 18,
      stateEnteredEventDetails: {
        name: 'CellSizeDistributionFilter',
      },
    },
    {
      // Iteration 0
      type: 'TaskStateExited',
      id: 22,
      previousEventId: '20-one-comlpetion-vs-unstarted',
      stateExitedEventDetails: {
        name: 'MitochondrialContentFilter',
      },
    },
    {
      // Iteration 1
      type: 'TaskSucceeded',
      id: 23,
      previousEventId: 21,
    },
    {
      // Iteration 1
      type: 'TaskStateExited',
      id: '24-two-completions-vs-one',
      previousEventId: 23,
      stateExitedEventDetails: {
        name: 'CellSizeDistributionFilter',
      },
    },
    {
      // Iteration 1
      type: 'TaskStateEntered',
      id: 25,
      previousEventId: '24-two-completions-vs-one',
      stateEnteredEventDetails: {
        name: 'MitochondrialContentFilter',
      },
    },
    {
      // Iteration 1
      type: 'TaskSucceeded',
      id: 26,
      previousEventId: 25,
    },
    {
      // Iteration 1
      type: 'TaskStateExited',
      id: 27,
      previousEventId: 26,
      stateExitedEventDetails: {
        name: 'MitochondrialContentFilter',
      },
    },
    {
      // Iteration 1
      type: 'MapIterationSucceeded',
      id: 28,
      previousEventId: 27,
      mapIterationSucceededEventDetails: {
        name: 'Filters',
        index: 1,
      },
    },
    {
      // Iteration 0
      type: 'MapIterationSucceeded',
      id: 29,
      previousEventId: 22,
      mapIterationSucceededEventDetails: {
        name: 'Filters',
        index: 0,
      },
    },
    {
      type: 'MapStateSucceeded',
      id: 30,
      previousEventId: 29,
    },
    {
      type: 'MapStateExited',
      id: 31,
      previousEventId: 30,
      stateExitedEventDetails: {
        name: 'Filters',
      },
    },
    {
      type: 'TaskStateEntered',
      id: 32,
      previousEventId: 31,
      stateEnteredEventDetails: {
        name: 'DataIntegration',
      },
    },
    {
      type: 'TaskSucceeded',
      id: 33,
      previousEventId: 32,
    },
    {
      type: 'TaskStateExited',
      id: 34,
      previousEventId: 33,
      stateExitedEventDetails: {
        name: 'DataIntegration',
      },
    },
  ];

  const singleIterationHistory = [
    {
      type: 'ExecutionStarted',
      id: 1,
      previousEventId: 0,
    },
    {
      type: 'Dummy',
      id: 'dummy-state-having-zero-as-previous',
      previousEventId: 0,
    },
    {
      type: 'MapStateEntered',
      id: 12,
      previousEventId: 'dummy-state-having-zero-as-previous',
      stateEnteredEventDetails: {
        name: 'Filters',
      },
    },
    {
      type: 'MapStateStarted',
      id: 13,
      previousEventId: 12,
      mapStateStartedEventDetails: {
        length: 1,
      },
    },
    {
      type: 'MapIterationStarted',
      id: 14,
      previousEventId: 13,
      mapIterationStartedEventDetails: {
        name: 'Filters',
        index: 0,
      },
    },
    {
      type: 'TaskStateEntered',
      id: 15,
      previousEventId: 14,
      stateEnteredEventDetails: {
        name: 'CellSizeDistributionFilter',
      },
    },
    {
      type: 'TaskSucceeded',
      id: 16,
      previousEventId: 15,
    },
    {
      type: 'TaskStateExited',
      id: 17,
      previousEventId: 16,
      stateExitedEventDetails: {
        name: 'CellSizeDistributionFilter',
      },
    },
    {
      type: 'MapIterationSucceeded',
      id: 18,
      previousEventId: 17,
      mapIterationSucceededEventDetails: {
        name: 'Filters',
        index: 0,
      },
    },
    {
      type: 'MapStateSucceeded',
      id: 19,
      previousEventId: 18,
    },
    {
      type: 'MapStateExited',
      id: 20,
      previousEventId: 19,
      stateExitedEventDetails: {
        name: 'Filters',
      },
    },
    {
      type: 'TaskStateEntered',
      id: 21,
      previousEventId: 20,
      stateEnteredEventDetails: {
        name: 'DataIntegration',
      },
    },
    {
      type: 'TaskSucceeded',
      id: 22,
      previousEventId: 21,
    },
    {
      type: 'TaskStateExited',
      id: 23,
      previousEventId: 22,
      stateExitedEventDetails: {
        name: 'DataIntegration',
      },
    },
  ];


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
});

describe('pipelineStatus', () => {
  const mockNotRunResponse = {
    meta: {
      [constants.GEM2S_PROCESS_NAME]: {
        stateMachineArn: '',
        executionArn: '',
      },
      [constants.QC_PROCESS_NAME]: {
        stateMachineArn: '',
        executionArn: '',
      },
    },
  };
  const mockHasBeenRun = {
    meta: {
      [constants.GEM2S_PROCESS_NAME]: {
        stateMachineArn: 'arnSM_gem2s',
        executionArn: 'arnE_sem2s',
        paramsHash: 'hashOfTheSamplesData',
      },
      [constants.QC_PROCESS_NAME]: {
        stateMachineArn: 'arnSM_qc',
        executionArn: 'arnE_qc',
      },
    },
  };
  const mockHasBeenRunLegacy = {
    meta: {
      [constants.GEM2S_PROCESS_NAME]: {
        stateMachineArn: 'arnSM_gem2s',
        executionArn: 'arnE_sem2s',
      },
      [constants.QC_PROCESS_NAME]: {
        stateMachineArn: 'arnSM_qc',
        executionArn: 'arnE_qc',
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
    getExperimentAttributesSpy.mockClear();
    AWSMock.setSDKInstance(AWS);
    AWSMock.mock('StepFunctions', 'describeExecution', (params, callback) => {
      callback(null, mockDescribeExecution(params));
    });
    AWSMock.mock('StepFunctions', 'getExecutionHistory', (params, callback) => {
      callback(null, { events: [] });
    });
    AWSMock.mock('DynamoDB', 'getItem', (params, callback) => {
      callback(null, mockDynamoGetItem(params));
    });
  });

  it('handles properly an empty dynamodb record', async () => {
    getExperimentAttributesSpy.mockReturnValueOnce(mockNotRunResponse);
    const status = await pipelineStatus('1234', constants.QC_PROCESS_NAME);
    expect(status).toEqual({
      [constants.QC_PROCESS_NAME]: {
        startDate: null,
        stopDate: null,
        status: constants.NOT_CREATED,
        completedSteps: [],
      },
    });
    expect(mockDynamoGetItem).not.toHaveBeenCalled();
  });
  it('returns a true "needsRunning" attribute for failed/not started gem2s pipelines', async () => {
    getExperimentAttributesSpy.mockReturnValue(mockHasBeenRun);

    // eslint-disable-next-line no-restricted-syntax
    for (const state of constants.STATES.filter(
      (st) => !(st === constants.RUNNING || st === constants.SUCCEEDED),
    )) {
      mockDescribeExecution.mockReturnValue({ startDate: null, stopDate: null, status: state });
      // eslint-disable-next-line no-await-in-loop
      const status = await pipelineStatus('1234', constants.GEM2S_PROCESS_NAME);
      expect(status[constants.GEM2S_PROCESS_NAME].needsRunning).toBe(true);
      expect(mockDynamoGetItem).not.toHaveBeenCalled();
    }
  });
  it('returns a false "needsRunning" attribute for running gem2s pipelines', async () => {
    getExperimentAttributesSpy.mockReturnValue(mockHasBeenRun);
    mockDescribeExecution.mockReturnValue(
      { startDate: null, stopDate: null, status: constants.RUNNING },
    );
    const status = await pipelineStatus('1234', constants.GEM2S_PROCESS_NAME);
    expect(status[constants.GEM2S_PROCESS_NAME].needsRunning).toBe(false);
    expect(mockDynamoGetItem).not.toHaveBeenCalled();
  });
  it('returns a true "needsRunning" attribute for sucesful gem2s pipelines without hash', async () => {
    getExperimentAttributesSpy.mockReturnValue(mockHasBeenRunLegacy);
    mockDescribeExecution.mockReturnValue(
      { startDate: null, stopDate: null, status: constants.SUCCEEDED },
    );
    const status = await pipelineStatus('1234', constants.GEM2S_PROCESS_NAME);
    expect(status[constants.GEM2S_PROCESS_NAME].needsRunning).toBe(true);
    expect(mockDynamoGetItem).not.toHaveBeenCalled();
  });
  it('uses dynamodb to determine "needsRunning" attribute for succesful gem2s pipelines', async () => {
    getExperimentAttributesSpy.mockReturnValue(mockHasBeenRun);
    mockDescribeExecution.mockReturnValue(
      { startDate: null, stopDate: null, status: constants.SUCCEEDED },
    );
    jest.spyOn(ProjectService.prototype, 'getProject').mockReturnValue({ metadataKeys: [] });
    const status = await pipelineStatus('1234', constants.GEM2S_PROCESS_NAME);
    expect(status[constants.GEM2S_PROCESS_NAME].needsRunning).toBe(true);
    expect(mockDynamoGetItem).toHaveBeenCalled();
  });
  it('returns a false "needsRunning" attribute for succesful gem2s pipelines with matching hashes', async () => {
    getExperimentAttributesSpy.mockReturnValue(mockHasBeenRun);
    mockDescribeExecution.mockReturnValue(
      { startDate: null, stopDate: null, status: constants.SUCCEEDED },
    );
    const gem2sParamsSpy = jest.spyOn(ProjectService.prototype, 'getGem2sParams').mockReturnValue({ paramsHash: 'hashOfTheSamplesData' });
    const status = await pipelineStatus('1234', constants.GEM2S_PROCESS_NAME);
    expect(status[constants.GEM2S_PROCESS_NAME].needsRunning).toBe(false);
    expect(gem2sParamsSpy).toHaveBeenCalled();
  });
});
