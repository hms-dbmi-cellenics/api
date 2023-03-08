
const filterToStepName = {
  classifier: 'ClassifierFilterMap',
  cellSizeDistribution: 'CellSizeDistributionFilterMap',
  mitochondrialContent: 'MitochondrialContentFilterMap',
  numGenesVsNumUmis: 'NumGenesVsNumUmisFilterMap',
  doubletScores: 'DoubletScoresFilterMap',
  dataIntegration: 'DataIntegration',
  configureEmbedding: 'ConfigureEmbedding',
};

const qcStepNames = [
  'ClassifierFilterMap',
  'CellSizeDistributionFilterMap',
  'MitochondrialContentFilterMap',
  'NumGenesVsNumUmisFilterMap',
  'DoubletScoresFilterMap',
  'DataIntegration',
  'ConfigureEmbedding',
];

const backendStepNamesToStepName = {
  ClassifierFilter: 'ClassifierFilterMap',
  CellSizeDistributionFilter: 'CellSizeDistributionFilterMap',
  MitochondrialContentFilter: 'MitochondrialContentFilterMap',
  NumGenesVsNumUmisFilter: 'NumGenesVsNumUmisFilterMap',
  DoubletScoresFilter: 'DoubletScoresFilterMap',
  DataIntegration: 'DataIntegration',
  ConfigureEmbedding: 'ConfigureEmbedding',
};

const stepNameToBackendStepNames = {
  ClassifierFilterMap: 'ClassifierFilter',
  CellSizeDistributionFilterMap: 'CellSizeDistributionFilter',
  MitochondrialContentFilterMap: 'MitochondrialContentFilter',
  NumGenesVsNumUmisFilterMap: 'NumGenesVsNumUmisFilter',
  DoubletScoresFilterMap: 'DoubletScoresFilter',
  DataIntegration: 'DataIntegration',
  ConfigureEmbedding: 'ConfigureEmbedding',
};

module.exports = {
  stepNameToBackendStepNames, backendStepNamesToStepName, qcStepNames, filterToStepName,
};
