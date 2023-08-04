const { OK } = require('../../../utils/responses');

// arn:aws:states:eu-west-1:242905224710:stateMachine:biomage-subset-staging-1cea1c66372c044e907e66590b3dc26deba3d09f
// arn:aws:states:eu-west-1:242905224710:stateMachine:biomage-qc-staging-c8cd43dc16f16394ab2809698ae6fb6815e4a83f
// arn:aws:states:eu-west-1:242905224710:stateMachine:biomage-gem2s-staging-c8cd43dc16f16394ab2809698ae6fb6815e4a83f
// arn:aws:states:eu-west-1:242905224710:stateMachine:biomage-copy-staging-6d09b858e01c10521b9f017f6b27f4909fd0ff30
// arn:aws:states:eu-west-1:242905224710:stateMachine:biomage-seurat-staging-7b5ae2e307c63f3d4ecb8af480c3e8cd60f1baf7

const retryExperiment = async (req, res) => {
  console.log(req);
  res.json(OK());
};

module.exports = {
  retryExperiment,
};
