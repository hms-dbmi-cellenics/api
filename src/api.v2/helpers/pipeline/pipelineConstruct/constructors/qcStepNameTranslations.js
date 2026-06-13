
const filterToStepName = {
  classifier: 'ClassifierFilterMap',
  cellSizeDistribution: 'CellSizeDistributionFilterMap',
  mitochondrialContent: 'MitochondrialContentFilterMap',
  numGenesVsNumUmis: 'NumGenesVsNumUmisFilterMap',
  doubletScores: 'DoubletScoresFilterMap',
  spatialUmiOutlier: 'SpatialUmiOutlierFilterMap',
  spatialNumGenesOutlier: 'SpatialNumGenesOutlierFilterMap',
  spatialMitoOutlier: 'SpatialMitoOutlierFilterMap',
  dataIntegration: 'DataIntegration',
  configureEmbedding: 'ConfigureEmbedding',
};

// Flat ordering of all QC steps (single-cell + spatial). Spatial and single-cell
// paths never both run; buildQCPipelineSteps filters to the technology's steps.
const qcStepNames = [
  'ClassifierFilterMap',
  'CellSizeDistributionFilterMap',
  'MitochondrialContentFilterMap',
  'NumGenesVsNumUmisFilterMap',
  'DoubletScoresFilterMap',
  'SpatialUmiOutlierFilterMap',
  'SpatialNumGenesOutlierFilterMap',
  'SpatialMitoOutlierFilterMap',
  'DataIntegration',
  'ConfigureEmbedding',
];

const backendStepNamesToStepName = {
  ClassifierFilter: 'ClassifierFilterMap',
  CellSizeDistributionFilter: 'CellSizeDistributionFilterMap',
  MitochondrialContentFilter: 'MitochondrialContentFilterMap',
  NumGenesVsNumUmisFilter: 'NumGenesVsNumUmisFilterMap',
  DoubletScoresFilter: 'DoubletScoresFilterMap',
  SpatialUmiOutlierFilter: 'SpatialUmiOutlierFilterMap',
  SpatialNumGenesOutlierFilter: 'SpatialNumGenesOutlierFilterMap',
  SpatialMitoOutlierFilter: 'SpatialMitoOutlierFilterMap',
  DataIntegration: 'DataIntegration',
  ConfigureEmbedding: 'ConfigureEmbedding',
};

const stepNameToBackendStepNames = {
  ClassifierFilterMap: 'ClassifierFilter',
  CellSizeDistributionFilterMap: 'CellSizeDistributionFilter',
  MitochondrialContentFilterMap: 'MitochondrialContentFilter',
  NumGenesVsNumUmisFilterMap: 'NumGenesVsNumUmisFilter',
  DoubletScoresFilterMap: 'DoubletScoresFilter',
  SpatialUmiOutlierFilterMap: 'SpatialUmiOutlierFilter',
  SpatialNumGenesOutlierFilterMap: 'SpatialNumGenesOutlierFilter',
  SpatialMitoOutlierFilterMap: 'SpatialMitoOutlierFilter',
  DataIntegration: 'DataIntegration',
  ConfigureEmbedding: 'ConfigureEmbedding',
};

module.exports = {
  stepNameToBackendStepNames, backendStepNamesToStepName, qcStepNames, filterToStepName,
};
