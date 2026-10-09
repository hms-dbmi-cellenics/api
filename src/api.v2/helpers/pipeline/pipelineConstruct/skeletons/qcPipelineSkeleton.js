const _ = require('lodash');
const { END_OF_PIPELINE } = require('../../../../constants');
const { createCatchSteps } = require('../constructors/createHandleErrorStep');

// Builds a per-sample Map state that runs a single QC filter task over all samples.
const createPerSampleFilterMap = (next, taskName, filterStateName) => ({
  Type: 'Map',
  Next: next,
  ResultPath: null,
  ItemsPath: '$.samples',
  Iterator: {
    StartAt: filterStateName,
    States: {
      [filterStateName]: {
        XStepType: 'create-new-step',
        XConstructorArgs: {
          perSample: true,
          taskName,
        },
        End: true,
      },
    },
  },
  Catch: createCatchSteps(),
});

// Shared tail steps (run after the filters for every technology).
const dataIntegrationAndEmbedding = {
  DataIntegration: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      perSample: false,
      taskName: 'dataIntegration',
      uploadCountMatrix: true,
    },
    Next: 'ConfigureEmbedding',
    XCatch: createCatchSteps(),
  },
  ConfigureEmbedding: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      perSample: false,
      taskName: 'configureEmbedding',
    },
    Next: END_OF_PIPELINE,
    XCatch: createCatchSteps(),
  },
};

const qcPipelineSteps = {
  ClassifierFilterMap: {
    Type: 'Map',
    Next: 'CellSizeDistributionFilterMap',
    ResultPath: null,
    ItemsPath: '$.samples',
    Iterator: {
      StartAt: 'ClassifierFilter',
      States: {
        ClassifierFilter: {
          XStepType: 'create-new-step',
          XConstructorArgs: {
            perSample: true,
            taskName: 'classifier',
          },
          End: true,
        },
      },
    },
    Catch: createCatchSteps(),
  },
  CellSizeDistributionFilterMap: {
    Type: 'Map',
    Next: 'MitochondrialContentFilterMap',
    ResultPath: null,
    ItemsPath: '$.samples',
    Iterator: {
      StartAt: 'CellSizeDistributionFilter',
      States: {
        CellSizeDistributionFilter: {
          XStepType: 'create-new-step',
          XConstructorArgs: {
            perSample: true,
            taskName: 'cellSizeDistribution',
          },
          End: true,
        },
      },
    },
    Catch: createCatchSteps(),
  },
  MitochondrialContentFilterMap: {
    Type: 'Map',
    Next: 'NumGenesVsNumUmisFilterMap',
    ResultPath: null,
    ItemsPath: '$.samples',
    Iterator: {
      StartAt: 'MitochondrialContentFilter',
      States: {
        MitochondrialContentFilter: {
          XStepType: 'create-new-step',
          XConstructorArgs: {
            perSample: true,
            taskName: 'mitochondrialContent',
          },
          End: true,
        },
      },
    },
    Catch: createCatchSteps(),
  },
  NumGenesVsNumUmisFilterMap: {
    Type: 'Map',
    Next: 'DoubletScoresFilterMap',
    ResultPath: null,
    ItemsPath: '$.samples',
    Iterator: {
      StartAt: 'NumGenesVsNumUmisFilter',
      States: {
        NumGenesVsNumUmisFilter: {
          XStepType: 'create-new-step',
          XConstructorArgs: {
            perSample: true,
            taskName: 'numGenesVsNumUmis',
          },
          End: true,
        },
      },
    },
    Catch: createCatchSteps(),
  },
  DoubletScoresFilterMap: {
    Type: 'Map',
    Next: 'DataIntegration',
    ResultPath: null,
    ItemsPath: '$.samples',
    Iterator: {
      StartAt: 'DoubletScoresFilter',
      States: {
        DoubletScoresFilter: {
          XStepType: 'create-new-step',
          XConstructorArgs: {
            perSample: true,
            taskName: 'doubletScores',
          },
          End: true,
        },
      },
    },
    Catch: createCatchSteps(),
  },
  ...dataIntegrationAndEmbedding,
};

// Visium HD QC: cells are defined by segmentation, so the single-cell filters
// are replaced by three spatial QC metric filters (UMI, number of genes,
// mitochondrial content) before integration/embedding.
const qcSpatialPipelineSteps = {
  SpatialUmiOutlierFilterMap: createPerSampleFilterMap(
    'SpatialNumGenesOutlierFilterMap', 'spatialUmiOutlier', 'SpatialUmiOutlierFilter',
  ),
  SpatialNumGenesOutlierFilterMap: createPerSampleFilterMap(
    'SpatialMitoOutlierFilterMap', 'spatialNumGenesOutlier', 'SpatialNumGenesOutlierFilter',
  ),
  SpatialMitoOutlierFilterMap: createPerSampleFilterMap(
    'DataIntegration', 'spatialMitoOutlier', 'SpatialMitoOutlierFilter',
  ),
  ...dataIntegrationAndEmbedding,
};

// Xenium QC: a count-density filter first, then the UMI and gene filters.
// Xenium panels have no mitochondrial genes, so there is no mito filter.
const qcXeniumPipelineSteps = {
  SpatialCountDensityFilterMap: createPerSampleFilterMap(
    'SpatialUmiOutlierFilterMap', 'spatialCountDensity', 'SpatialCountDensityFilter',
  ),
  SpatialUmiOutlierFilterMap: createPerSampleFilterMap(
    'SpatialNumGenesOutlierFilterMap', 'spatialUmiOutlier', 'SpatialUmiOutlierFilter',
  ),
  SpatialNumGenesOutlierFilterMap: createPerSampleFilterMap(
    'DataIntegration', 'spatialNumGenesOutlier', 'SpatialNumGenesOutlierFilter',
  ),
  ...dataIntegrationAndEmbedding,
};

const qcPipelineStepsByTechnology = {
  visium_hd: qcSpatialPipelineSteps,
  xenium: qcXeniumPipelineSteps,
};

const getQcPipelineSteps = (technology) => (
  qcPipelineStepsByTechnology[technology] || qcPipelineSteps
);

const buildQCPipelineSteps = (qcSteps, technology = null) => {
  const allSteps = getQcPipelineSteps(technology);

  const stepsToRemove = Object.keys(allSteps)
    .filter((step) => !qcSteps.includes(step) && step !== END_OF_PIPELINE);

  return _.omit(allSteps, stepsToRemove);
};

module.exports = {
  buildQCPipelineSteps,
  qcPipelineSteps,
  qcSpatialPipelineSteps,
  qcXeniumPipelineSteps,
  getQcPipelineSteps,
};
