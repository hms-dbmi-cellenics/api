const Plot = require('../../api.v2/model/Plot');
const getLogger = require('../getLogger');
const events = require('./events');

const logger = getLogger('[invalidatePlotsForEvent] - ');

const plots = {
  CATEGORICAL_EMBEDDING: {
    plotId: 'embeddingCategoricalMain',
    keys: ['selectedSample', 'selectedCellSet'],
  },
  FREQUENCY_PLOT: {
    plotId: 'frequencyPlotMain',
    keys: ['xAxisGrouping', 'proportionGrouping'],
  },
  TRAJECTORY_ANALYSIS: {
    plotId: 'trajectoryAnalysisMain',
    keys: ['selectedNodes'],
  },
  CONTINUOUS_EMBEDDING: {
    plotId: 'embeddingContinuousMain',
    keys: ['selectedSample'],
  },
  MARKER_HEATMAP: {
    plotId: 'markerHeatmapPlotMain',
    keys: ['selectedPoints', 'selectedCellSet', 'selectedTracks', 'groupedTracks'],
  },
  CUSTOM_HEATMAP: {
    plotId: 'heatmapPlotMain',
    keys: ['selectedPoints', 'selectedCellSet', 'selectedTracks', 'groupedTracks'],
  },
  VIOLIN_PLOT: {
    plotId: 'ViolinMain',
    keys: ['selectedPoints', 'selectedCellSet'],
  },
  // '// ViolinMain-0:',
  DOT_PLOT: {
    plotId: 'dotPlotMain',
    keys: ['selectedPoints', 'selectedCellSet'],
  },
  NORMALIZED_MATRIX: {
    plotId: 'normalized-matrix',
    keys: ['sample', 'louvain', 'metadata', 'scratchpad'],
  },
  VOLCANO_PLOT: {
    plotId: 'volcanoPlotMain',
    keys: ['cellSet', 'compareWith', 'basis'],
  },
};

const invalidatePlot = async (experimentId, { plotId, keys }) => {
  await new Plot().invalidateAttributes(experimentId, plotId, keys);
};

const invalidateCategoricalEmbedding = async (experimentId) => {
  await invalidatePlot(experimentId, plots.CATEGORICAL_EMBEDDING);
};

const invalidateFrequencyPlot = async (experimentId) => {
  await invalidatePlot(experimentId, plots.FREQUENCY_PLOT);
};

const invalidateTrajectoryAnalysis = async (experimentId) => {
  await invalidatePlot(experimentId, plots.TRAJECTORY_ANALYSIS);
};

const invalidateContinuousEmbedding = async (experimentId) => {
  await invalidatePlot(experimentId, plots.CONTINUOUS_EMBEDDING);
};

const invalidateMarkerHeatmapPlot = async (experimentId) => {
  await invalidatePlot(experimentId, plots.MARKER_HEATMAP);
};

const invalidateCustomHeatmapPlot = async (experimentId) => {
  await invalidatePlot(experimentId, plots.CUSTOM_HEATMAP);
};

const invalidateViolinPlot = async (experimentId) => {
  await invalidatePlot(experimentId, plots.VIOLIN_PLOT);
};

const invalidateDotPlot = async (experimentId) => {
  await invalidatePlot(experimentId, plots.DOT_PLOT);
};

const invalidateNormalizedMatrix = async (experimentId) => {
  await invalidatePlot(experimentId, plots.NORMALIZED_MATRIX);
};

const invalidateVolcanoPlot = async (experimentId) => {
  await invalidatePlot(experimentId, plots.VOLCANO_PLOT);
};

const affectedByCellSetsChanging = [
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

const executeAllPromises = async (experimentId, functionArray) => (
  await Promise.all(functionArray.map((func) => func(experimentId)))
);

const configInvalidatorsByEvent = {
  [events.CELL_SETS_MODIFIED]: async (experimentId) => {
    await executeAllPromises(experimentId, affectedByCellSetsChanging);
  },
  [events.EMBEDDING_MODIFIED]: async (experimentId) => {
    await invalidateTrajectoryAnalysis(experimentId);
  },
  [events.PIPELINE_RERUN]: async (experimentId) => {
    await executeAllPromises(
      experimentId,
      [...affectedByCellSetsChanging, invalidateTrajectoryAnalysis],
    );
  },
};

const invalidatePlotsForEvent = async (experimentId, event) => {
  logger.log(`Invalidating for event ${event}`);
  await configInvalidatorsByEvent[event](experimentId);
  logger.log(`Finished invalidating for event ${event}`);
};

module.exports = invalidatePlotsForEvent;
