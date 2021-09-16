const { firstStep, buildInitialSteps } = require('./utils');

const gem2SPipelineSteps = {
  DownloadGem: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'downloadGem',
    },
    Next: 'PreProcessing',
  },
  PreProcessing: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'preproc',
    },
    Next: 'EmptyDrops',
  },
  EmptyDrops: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'emptyDrops',
    },
    Next: 'DoubletScores',
  },
  DoubletScores: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'doubletScores',
    },
    Next: 'CreateSeurat',
  },
  CreateSeurat: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'createSeurat',
    },
    Next: 'PrepareExperiment',
  },
  PrepareExperiment: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'prepareExperiment',
    },
    Next: 'UploadToAWS',
  },
  UploadToAWS: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'uploadToAWS',
    },
    Next: 'EndOfGem2S',
  },
  EndOfGem2S: {
    Type: 'Pass',
    End: true,
  },
};

const getGem2sPipelineSkeleton = (clusterEnv) => ({
  Comment: `Gem2s Pipeline for clusterEnv '${clusterEnv}'`,
  StartAt: firstStep(clusterEnv),
  States: {
    ...buildInitialSteps(clusterEnv, 'DownloadGem'),
    ...getGem2sPipelineSkeleton,
  },
});

module.exports = { gem2SPipelineSteps, getGem2sPipelineSkeleton };
