// Disable semantic check because linter doesn't recognize jest mocks
// @ts-nocheck
const _ = require('lodash');

const invalidatePlotsForEvent = require('../../../src/utils/plotConfigInvalidation/invalidatePlotsForEvent');

const Plot = require('../../../src/api.v2/model/Plot');
const events = require('../../../src/utils/plotConfigInvalidation/events');
const invalidationResults = require('./mockData/invalidationResults');

jest.mock('../../../src/api.v2/model/Plot');

const plotInstance = new Plot();

const mockExperimentId = 'mockExperimentId';
const mockSockets = { emit: jest.fn() };

describe('invalidatePlotsForEvent', () => {
  it('Works correctly for CELL_SETS_MODIFIED', async () => {
    _.times(Object.keys(invalidationResults).length, () => {
      plotInstance.invalidateAttributesForMatches.mockImplementationOnce((expId, plotIdMatcher) => (
        Promise.resolve(invalidationResults[plotIdMatcher])
      ));
    });

    await invalidatePlotsForEvent(
      mockExperimentId, events.CELL_SETS_MODIFIED, mockSockets,
    );

    expect(plotInstance.invalidateAttributesForMatches.mock.calls).toMatchSnapshot({}, 'invalidateAttributesForMatches calls');

    // Notifies clients looking at the experiment of the update
    expect(mockSockets.emit).toHaveBeenCalledWith(
      `ExperimentUpdates-${mockExperimentId}`,
      { type: 'PlotConfigRefresh', updatedConfigs: Object.values(invalidationResults).flat() },
    );
  });

  it('Works correctly for EMBEDDING_MODIFIED', async () => {

  });
});
