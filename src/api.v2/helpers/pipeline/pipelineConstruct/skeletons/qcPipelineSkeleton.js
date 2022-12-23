const _ = require('lodash');
const { END_OF_PIPELINE } = require('../../../../constants');

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
  },
  DataIntegration: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      perSample: false,
      taskName: 'dataIntegration',
      uploadCountMatrix: true,
    },
    Next: 'ConfigureEmbedding',
  },
  ConfigureEmbedding: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      perSample: false,
      taskName: 'configureEmbedding',
    },
    Next: END_OF_PIPELINE,
  },
};


const buildQCPipelineSteps = (qcSteps) => {
  const stepsToRemove = Object.keys(qcPipelineSteps)
    .filter((step) => !qcSteps.includes(step) && step !== END_OF_PIPELINE);

  return _.omit(qcPipelineSteps, stepsToRemove);
};

module.exports = { buildQCPipelineSteps, qcPipelineSteps };
