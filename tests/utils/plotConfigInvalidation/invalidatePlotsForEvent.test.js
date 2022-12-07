// Disable semantic check because linter doesn't recognize jest mocks
// @ts-nocheck
const _ = require('lodash');

const invalidatePlotsForEvent = require('../../../src/utils/plotConfigInvalidation/invalidatePlotsForEvent');

const Plot = require('../../../src/api.v2/model/Plot');
const events = require('../../../src/utils/plotConfigInvalidation/events');
const invalidationResults = require('../../api.v2/mocks/data/invalidationResults');

jest.mock('../../../src/api.v2/model/Plot');

const plotInstance = new Plot();

const mockExperimentId = 'mockExperimentId';
const mockSockets = { emit: jest.fn() };

describe('invalidatePlotsForEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Works correctly for CELL_SETS_MODIFIED', async () => {
    const cellSetsResults = invalidationResults[events.CELL_SETS_MODIFIED];

    _.times(Object.keys(cellSetsResults).length, () => {
      plotInstance.invalidateAttributesForMatches.mockImplementationOnce((expId, plotIdMatcher) => (
        Promise.resolve(cellSetsResults[plotIdMatcher])
      ));
    });

    await invalidatePlotsForEvent(
      mockExperimentId, events.CELL_SETS_MODIFIED, mockSockets,
    );

    expect(plotInstance.invalidateAttributesForMatches.mock.calls).toMatchSnapshot({}, 'invalidateAttributesForMatches calls');

    // Notifies clients looking at the experiment of the update
    expect(mockSockets.emit).toHaveBeenCalledWith(
      `ExperimentUpdates-${mockExperimentId}`,
      { type: 'PlotConfigRefresh', updatedConfigs: Object.values(cellSetsResults).flat() },
    );
  });

  it('Works correctly for EMBEDDING_MODIFIED', async () => {
    const embeddingResults = invalidationResults[events.EMBEDDING_MODIFIED];

    _.times(Object.keys(embeddingResults).length, () => {
      plotInstance.invalidateAttributesForMatches.mockImplementationOnce((expId, plotIdMatcher) => (
        Promise.resolve(embeddingResults[plotIdMatcher])
      ));
    });

    await invalidatePlotsForEvent(
      mockExperimentId, events.EMBEDDING_MODIFIED, mockSockets,
    );

    expect(plotInstance.invalidateAttributesForMatches.mock.calls).toMatchSnapshot({}, 'invalidateAttributesForMatches calls');

    // Notifies clients looking at the experiment of the update
    expect(mockSockets.emit).toHaveBeenCalledWith(
      `ExperimentUpdates-${mockExperimentId}`,
      { type: 'PlotConfigRefresh', updatedConfigs: Object.values(embeddingResults).flat() },
    );
  });
});
