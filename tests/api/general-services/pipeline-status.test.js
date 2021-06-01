const pipelineConstants = require('../../../src/api/general-services/pipeline-manage/constants');
const pipelineStatus = require('../../../src/api/general-services/pipeline-status');
const ExperimentService = require('../../../src/api/route-services/experiment');

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

jest.mock('../../../src/api/route-services/experiment', () => jest.fn().mockImplementation(() => {
  // eslint-disable-next-line global-require
  const internalConstants = require('../../../src/api/general-services/pipeline-manage/constants');

  return {
    getPipelinesHandles: () => ({
      [internalConstants.GEM2S_PROCESS_NAME]: {
        stateMachineArn: '',
        executionArn: '',
      },
      [internalConstants.QC_PROCESS_NAME]: {
        stateMachineArn: '',
        executionArn: '',
      },
    }),
  };
}));

describe('pipelineStatus', () => {
  beforeEach(() => {
    ExperimentService.mockClear();
  });
  it('handles properly an empty dynamodb record', async () => {
    const status = await pipelineStatus('1234', pipelineConstants.QC_PROCESS_NAME);
    expect(status).toEqual({
      [pipelineConstants.QC_PROCESS_NAME]: {
        startDate: null,
        stopDate: null,
        status: pipelineConstants.NOT_CREATED,
        completedSteps: [],
      },
    });
  });
});
