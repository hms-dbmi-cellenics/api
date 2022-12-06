// subsetSeurat
// prepareExperiment
// uploadToAWS

// const paramsGetters = (taskName) => {
// if ()
// };

const getSubsetParams = (context, stepArgs) => {
  const { taskName } = stepArgs;
  const { taskParams } = context;

  return taskParams[taskName];
};

module.exports = getSubsetParams;
