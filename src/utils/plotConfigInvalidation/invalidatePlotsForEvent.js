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

const invalidateCategoricalEmbedding = async (experimentId) => (
  await invalidateMatchingPlots(experimentId, plots.CATEGORICAL_EMBEDDING)
);

const invalidateFrequencyPlot = async (experimentId) => (
  await invalidateMatchingPlots(experimentId, plots.FREQUENCY_PLOT)
);

const invalidateTrajectoryAnalysis = async (experimentId) => (
  await invalidateMatchingPlots(experimentId, plots.TRAJECTORY_ANALYSIS)
);

const invalidateContinuousEmbedding = async (experimentId) => (
  await invalidateMatchingPlots(experimentId, plots.CONTINUOUS_EMBEDDING)
);

const invalidateMarkerHeatmapPlot = async (experimentId) => (
  await invalidateMatchingPlots(experimentId, plots.MARKER_HEATMAP)
);

const invalidateCustomHeatmapPlot = async (experimentId) => (
  await invalidateMatchingPlots(experimentId, plots.CUSTOM_HEATMAP)
);

const invalidateViolinPlot = async (experimentId) => (
  await invalidateMatchingPlots(experimentId, plots.VIOLIN_PLOT)
);

const invalidateDotPlot = async (experimentId) => (
  await invalidateMatchingPlots(experimentId, plots.DOT_PLOT)
);

const invalidateNormalizedMatrix = async (experimentId) => (
  await invalidateMatchingPlots(experimentId, plots.NORMALIZED_MATRIX)
);

const invalidateVolcanoPlot = async (experimentId) => (
  await invalidateMatchingPlots(experimentId, plots.VOLCANO_PLOT)
);

const cellSetsChangingActions = [
  invalidateCategoricalEmbedding,
  invalidateFrequencyPlot,
  invalidateContinuousEmbedding,
  invalidateMarkerHeatmapPlot,
  invalidateCustomHeatmapPlot,
  invalidateViolinPlot,
  invalidateDotPlot,
  invalidateNormalizedMatrix,
  invalidateVolcanoPlot,
];

const configInvalidatorsByEvent = {
  [events.CELL_SETS_MODIFIED]: async (experimentId) => (
    // flatten because results are arrays of arrays (for each config updated for each plot type)
    // and we want a simple array with each config updated
    await Promise.all(
      cellSetsChangingActions.map((func) => func(experimentId)),
    )).flat(),
  [events.EMBEDDING_MODIFIED]: async (experimentId) => (
    await Promise.all([invalidateTrajectoryAnalysis(experimentId)])
  ),
};

const invalidatePlotsForEvent = async (experimentId, event, sockets) => {
  logger.log(`Invalidating for event ${event}`);
  const updatedConfigs = await configInvalidatorsByEvent[event](experimentId);

  const update = {
    type: 'PlotConfigRefresh',
    updatedConfigs,
  };

  sockets.emit(`ExperimentUpdates-${experimentId}`, update);
  logger.log(`Finished invalidating for event ${event}`);
};

module.exports = invalidatePlotsForEvent;
