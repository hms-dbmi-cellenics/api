const {
  gem2SPipelineSteps,
  gem2SSpatialPipelineSteps,
  getGem2sPipelineSteps,
  SPATIAL_TECHNOLOGIES,
} = require('../../../../../../src/api.v2/helpers/pipeline/pipelineConstruct/skeletons/gem2sPipelineSkeleton');

const singleCellSteps = [
  'DownloadGem',
  'PreProcessing',
  'EmptyDrops',
  'DoubletScores',
  'CreateSeurat',
  'PrepareExperiment',
  'UploadToAWS',
];

const spatialSteps = [
  'DownloadGem',
  'PreProcessing',
  'CreateSeurat',
  'PrepareExperiment',
  'UploadToAWS',
];

describe('getGem2sPipelineSteps', () => {
  it('declares visium_hd as a spatial technology', () => {
    expect(SPATIAL_TECHNOLOGIES).toContain('visium_hd');
  });

  it('returns the single-cell gem2s steps for a non-spatial technology (10x)', () => {
    const steps = getGem2sPipelineSteps('10x');
    expect(Object.keys(steps)).toEqual(singleCellSteps);
    expect(steps).toBe(gem2SPipelineSteps);
  });

  it('returns the single-cell gem2s steps when technology is null/undefined', () => {
    expect(Object.keys(getGem2sPipelineSteps(null))).toEqual(singleCellSteps);
    expect(Object.keys(getGem2sPipelineSteps(undefined))).toEqual(singleCellSteps);
  });

  it('returns spatial gem2s steps for visium_hd, skipping EmptyDrops and DoubletScores', () => {
    const steps = getGem2sPipelineSteps('visium_hd');
    expect(Object.keys(steps)).toEqual(spatialSteps);
    expect(steps).toBe(gem2SSpatialPipelineSteps);

    expect(steps).not.toHaveProperty('EmptyDrops');
    expect(steps).not.toHaveProperty('DoubletScores');
  });

  it('chains the spatial gem2s steps in order (PreProcessing -> CreateSeurat)', () => {
    const steps = getGem2sPipelineSteps('visium_hd');
    expect(steps.PreProcessing.Next).toEqual('CreateSeurat');
    expect(steps.CreateSeurat.Next).toEqual('PrepareExperiment');
    expect(steps.PrepareExperiment.Next).toEqual('UploadToAWS');
  });
});
