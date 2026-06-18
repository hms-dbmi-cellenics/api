const {
  buildQCPipelineSteps,
  getQcPipelineSteps,
  qcPipelineSteps,
  qcSpatialPipelineSteps,
} = require('../../../../../../src/api.v2/helpers/pipeline/pipelineConstruct/skeletons/qcPipelineSkeleton');

const singleCellStepNames = [
  'ClassifierFilterMap',
  'CellSizeDistributionFilterMap',
  'MitochondrialContentFilterMap',
  'NumGenesVsNumUmisFilterMap',
  'DoubletScoresFilterMap',
  'DataIntegration',
  'ConfigureEmbedding',
];

const spatialStepNames = [
  'SpatialUmiOutlierFilterMap',
  'SpatialNumGenesOutlierFilterMap',
  'SpatialMitoOutlierFilterMap',
  'DataIntegration',
  'ConfigureEmbedding',
];

describe('getQcPipelineSteps', () => {
  it('returns the single-cell steps for a non-spatial technology (10x)', () => {
    const steps = getQcPipelineSteps('10x');
    expect(Object.keys(steps)).toEqual(singleCellStepNames);
    expect(steps).toBe(qcPipelineSteps);
  });

  it('returns the single-cell steps when technology is null/undefined', () => {
    expect(Object.keys(getQcPipelineSteps(null))).toEqual(singleCellStepNames);
    expect(Object.keys(getQcPipelineSteps(undefined))).toEqual(singleCellStepNames);
  });

  it('returns only the three spatial filters + DataIntegration + ConfigureEmbedding for visium_hd', () => {
    const steps = getQcPipelineSteps('visium_hd');
    expect(Object.keys(steps)).toEqual(spatialStepNames);
    expect(steps).toBe(qcSpatialPipelineSteps);

    // none of the single-cell only filters are present
    expect(steps).not.toHaveProperty('ClassifierFilterMap');
    expect(steps).not.toHaveProperty('CellSizeDistributionFilterMap');
    expect(steps).not.toHaveProperty('MitochondrialContentFilterMap');
    expect(steps).not.toHaveProperty('NumGenesVsNumUmisFilterMap');
    expect(steps).not.toHaveProperty('DoubletScoresFilterMap');
  });

  it('returns only the three spatial filters + DataIntegration + ConfigureEmbedding for xenium', () => {
    const steps = getQcPipelineSteps('xenium');
    expect(Object.keys(steps)).toEqual(spatialStepNames);
    expect(steps).toBe(qcSpatialPipelineSteps);

    // none of the single-cell only filters are present
    expect(steps).not.toHaveProperty('ClassifierFilterMap');
    expect(steps).not.toHaveProperty('CellSizeDistributionFilterMap');
    expect(steps).not.toHaveProperty('MitochondrialContentFilterMap');
    expect(steps).not.toHaveProperty('NumGenesVsNumUmisFilterMap');
    expect(steps).not.toHaveProperty('DoubletScoresFilterMap');
  });

  it('chains the spatial filter Map states in order, ending at DataIntegration', () => {
    const steps = getQcPipelineSteps('visium_hd');

    expect(steps.SpatialUmiOutlierFilterMap.Next).toEqual('SpatialNumGenesOutlierFilterMap');
    expect(steps.SpatialNumGenesOutlierFilterMap.Next).toEqual('SpatialMitoOutlierFilterMap');
    expect(steps.SpatialMitoOutlierFilterMap.Next).toEqual('DataIntegration');
    expect(steps.DataIntegration.Next).toEqual('ConfigureEmbedding');
  });

  it('builds each spatial filter as a per-sample Map running the matching task', () => {
    const steps = getQcPipelineSteps('visium_hd');

    const umiMap = steps.SpatialUmiOutlierFilterMap;
    expect(umiMap.Type).toEqual('Map');
    expect(umiMap.ItemsPath).toEqual('$.samples');

    const innerState = umiMap.Iterator.States.SpatialUmiOutlierFilter;
    expect(innerState.XConstructorArgs).toEqual({
      perSample: true,
      taskName: 'spatialUmiOutlier',
    });
  });
});

describe('buildQCPipelineSteps', () => {
  it('keeps all single-cell steps when all are requested (non-spatial)', () => {
    const result = buildQCPipelineSteps(singleCellStepNames, '10x');
    expect(Object.keys(result)).toEqual(singleCellStepNames);
  });

  it('omits requested-out single-cell steps (requested-step omission still works)', () => {
    const requested = [
      'MitochondrialContentFilterMap',
      'NumGenesVsNumUmisFilterMap',
      'DoubletScoresFilterMap',
      'DataIntegration',
      'ConfigureEmbedding',
    ];

    const result = buildQCPipelineSteps(requested, '10x');
    expect(Object.keys(result)).toEqual(requested);
    expect(result).not.toHaveProperty('ClassifierFilterMap');
    expect(result).not.toHaveProperty('CellSizeDistributionFilterMap');
  });

  it('defaults to single-cell steps when technology arg is omitted', () => {
    const result = buildQCPipelineSteps(singleCellStepNames);
    expect(Object.keys(result)).toEqual(singleCellStepNames);
  });

  it('keeps only the spatial steps for visium_hd and never includes single-cell filters', () => {
    const result = buildQCPipelineSteps(spatialStepNames, 'visium_hd');
    expect(Object.keys(result)).toEqual(spatialStepNames);
  });

  it('omits requested-out spatial steps for visium_hd', () => {
    const requested = [
      'SpatialMitoOutlierFilterMap',
      'DataIntegration',
      'ConfigureEmbedding',
    ];

    const result = buildQCPipelineSteps(requested, 'visium_hd');
    expect(Object.keys(result)).toEqual(requested);
    expect(result).not.toHaveProperty('SpatialUmiOutlierFilterMap');
    expect(result).not.toHaveProperty('SpatialNumGenesOutlierFilterMap');
  });
});
