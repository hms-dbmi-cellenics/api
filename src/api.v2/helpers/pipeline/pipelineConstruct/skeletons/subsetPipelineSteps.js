const subsetPipelineSteps = {
  SubsetSeurat: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'subsetSeurat',
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

module.exports = subsetPipelineSteps;
