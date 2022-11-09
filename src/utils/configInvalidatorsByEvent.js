const invalidateCategoricalEmbedding = async () => { };
const invalidateFrequencyPlot = async () => { };
const invalidateTrajectoryAnalysis = async () => { };
const invalidateContinuousEmbedding = async () => { };
const invalidateMarkerHeatmapPlot = async () => { };
const invalidateCustomHeatmapPlot = async () => { };
const invalidateViolinPlot = async () => { };
const invalidateDotPlot = async () => { };
const invalidateNormalizedMatrix = async () => { };
const invalidateVolcanoPlot = async () => { };

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

const executeAllPromises = async (functionArray) => (
  await Promise.all(functionArray.map((func) => func()))
);

const configInvalidatorsByEvent = {
  cellSetsModified: async () => {
    await executeAllPromises(affectedByCellSetsChanging);
  },
  embeddingModified: async () => {
    await invalidateTrajectoryAnalysis();
  },
  pipelineRerun: async () => {
    await executeAllPromises([
      ...affectedByCellSetsChanging,
      invalidateTrajectoryAnalysis,
    ]);
  },
};


module.exports = configInvalidatorsByEvent;
