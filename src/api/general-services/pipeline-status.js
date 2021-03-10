
const getStepsFromExecutionHistory = () => [];

const getPipelineStatus = async (/* experimentId */) => {
  const response = {
    pipeline: {
      startDate: null,
      stopDate: null,
      status: '',
      completedSteps: [],
    },
  };
  return response;
};

module.exports = getPipelineStatus;
module.exports.getStepsFromExecutionHistory = getStepsFromExecutionHistory;
