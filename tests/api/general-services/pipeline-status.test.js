const pipelineStatus = require('../../../src/api/general-services/pipeline-status');

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
      id: '24-two-completions-vs-zero',
      previousEventId: 23,
      stateExitedEventDetails: {
        name: 'CellSizeDistributionFilter',
      },
    },
  ];

  const truncateHistory = (lastEventId) => {
    const lastEventIndex = fullHistory.findIndex((element) => element.id === lastEventId);
    return fullHistory.slice(0, lastEventIndex + 1);
  };

  it('returns empty array if nothing has been completed', () => {
    const events = truncateHistory('19-before-anything-completed');
    const completedSteps = pipelineStatus.getStepsFromExecutionHistory({ events });
    expect(completedSteps).toEqual([]);
  });

  it('returns empty array if any branch has not started', () => {
    const events = truncateHistory('20-one-comlpetion-vs-unstarted');
    const completedSteps = pipelineStatus.getStepsFromExecutionHistory({ events });
    expect(completedSteps).toEqual([]);
  });

  it('returns steps completed in all branches', () => {
    const events = truncateHistory('24-two-completions-vs-zero');
    const completedSteps = pipelineStatus.getStepsFromExecutionHistory({ events });
    expect(completedSteps).toEqual(['CellSizeDistributionFilter']);
  });
});
