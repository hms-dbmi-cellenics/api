const seuratPipelineSteps = {
  DownloadSeurat: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'downloadSeurat',
    },
    Next: 'PreProcessing',
  },
  PreProcessing: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'preprocSeurat',
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

module.exports = { seuratPipelineSteps };
