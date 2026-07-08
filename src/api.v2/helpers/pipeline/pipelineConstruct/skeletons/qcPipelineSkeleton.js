const _ = require('lodash');
const { END_OF_PIPELINE } = require('../../../../constants');
const { createCatchSteps } = require('../constructors/createHandleErrorStep');
const { SPATIAL_TECHNOLOGIES } = require('./gem2sPipelineSkeleton');

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

// Spatial (e.g. Visium HD) QC: cells are defined by segmentation, so the
// single-cell filters are replaced by three spatial local-outlier filters
// (UMI, number of genes, mitochondrial content) before integration/embedding.
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

const getQcPipelineSteps = (technology) => (
  SPATIAL_TECHNOLOGIES.includes(technology) ? qcSpatialPipelineSteps : qcPipelineSteps
);

const buildQCPipelineSteps = (qcSteps, technology = null) => {
  const allSteps = getQcPipelineSteps(technology);

  const stepsToRemove = Object.keys(allSteps)
    .filter((step) => !qcSteps.includes(step) && step !== END_OF_PIPELINE);

  return _.omit(allSteps, stepsToRemove);
};

module.exports = {
  buildQCPipelineSteps, qcPipelineSteps, qcSpatialPipelineSteps, getQcPipelineSteps,
};
