const { OK } = require('../../../utils/responses');

// stateMachine:biomage-subset
// stateMachine:biomage-qc
// stateMachine:biomage-gem2s
// stateMachine:biomage-copy
// stateMachine:biomage-seurat

const retryExperiment = async (req, res) => {
  console.log(req);
  res.json(OK());
};

module.exports = {
  retryExperiment,
};
