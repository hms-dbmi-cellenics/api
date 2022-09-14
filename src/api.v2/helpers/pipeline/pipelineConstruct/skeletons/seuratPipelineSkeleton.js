const seuratPipelineSteps = {
  DownloadSeurat: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'downloadSeurat',
    },
    Next: 'ProcessSeurat',
  },
  ProcessSeurat: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'processSeurat',
    },
    Next: 'UploadSeuratToAWS',
  },
  UploadSeuratToAWS: {
    XStepType: 'create-new-step',
    XConstructorArgs: {
      taskName: 'uploadSeuratToAWS',
    },
    Next: 'EndOfSeurat',
  },
  EndOfSeurat: {
    Type: 'Pass',
    End: true,
  },
};

module.exports = { seuratPipelineSteps };
