const Plot = require('../../api.v2/model/Plot');
const getLogger = require('../getLogger');
const events = require('./events');

const logger = getLogger('[invalidatePlotsForEvent] - ');

const plots = {
  CATEGORICAL_EMBEDDING: {
    plotIdMatcher: 'embeddingCategoricalMain',
    keys: ['selectedSample', 'selectedCellSet'],
  },
  FREQUENCY_PLOT: {
    plotIdMatcher: 'frequencyPlotMain',
    keys: ['xAxisGrouping', 'proportionGrouping'],
  },
  TRAJECTORY_ANALYSIS: {
    plotIdMatcher: 'trajectoryAnalysisMain',
    keys: ['selectedNodes'],
  },
  CONTINUOUS_EMBEDDING: {
    plotIdMatcher: 'embeddingContinuousMain',
    keys: ['selectedSample'],
  },
  MARKER_HEATMAP: {
    plotIdMatcher: 'markerHeatmapPlotMain',
    keys: ['selectedPoints', 'selectedCellSet', 'selectedTracks', 'groupedTracks'],
  },
  CUSTOM_HEATMAP: {
    plotIdMatcher: 'heatmapPlotMain',
    keys: ['selectedPoints', 'selectedCellSet', 'selectedTracks', 'groupedTracks'],
  },
  VIOLIN_PLOT: {
    plotIdMatcher: 'ViolinMain%',
    keys: ['selectedPoints', 'selectedCellSet'],
  },
  DOT_PLOT: {
    plotIdMatcher: 'dotPlotMain',
    keys: ['selectedPoints', 'selectedCellSet'],
  },
  NORMALIZED_MATRIX: {
    plotIdMatcher: 'normalized-matrix',
    keys: ['sample', 'louvain', 'metadata', 'scratchpad'],
  },
  VOLCANO_PLOT: {
    plotIdMatcher: 'volcanoPlotMain',
    keys: ['cellSet', 'compareWith', 'basis'],
  },
};

const invalidateMatchingPlots = async (experimentId, { plotIdMatcher, keys }) => (
  await new Plot().invalidateAttributesForMatches(experimentId, plotIdMatcher, keys)
);

const plotsChangedByEvent = {
  [events.CELL_SETS_MODIFIED]: [
    plots.CATEGORICAL_EMBEDDING,
    plots.FREQUENCY_PLOT,
    plots.CONTINUOUS_EMBEDDING,
    plots.MARKER_HEATMAP,
    plots.CUSTOM_HEATMAP,
    plots.VIOLIN_PLOT,
    plots.DOT_PLOT,
    plots.NORMALIZED_MATRIX,
    plots.VOLCANO_PLOT,
  ],
  [events.EMBEDDING_MODIFIED]: [
    plots.TRAJECTORY_ANALYSIS,
  ],
};

const invalidatePlotsForEvent = async (experimentId, event, sockets) => {
  logger.log(`Invalidating for event ${event}`);

  const plotsToInvalidate = plotsChangedByEvent[event];

  const updatedConfigs = (await Promise.all(
    plotsToInvalidate.map(
      async (plot) => await invalidateMatchingPlots(experimentId, plot),
    ),
    // flatten because results are arrays of arrays (for each config updated for each plot type)
  )).flat();

  const update = {
    type: 'PlotConfigRefresh',
    updatedConfigs,
  };

  sockets.emit(`ExperimentUpdates-${experimentId}`, update);
  logger.log(`Finished invalidating for event ${event}`);
};

module.exports = invalidatePlotsForEvent;
