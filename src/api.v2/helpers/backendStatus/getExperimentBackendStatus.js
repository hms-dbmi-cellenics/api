const constants = require('../../constants');
const getPipelineStatus = require('../pipeline/getPipelineStatus');
const getWorkerStatus = require('../worker/getWorkerStatus');

const getExperimentBackendStatus = async (experimentId) => {
  const [{ gem2s }, { qc }, { seurat }, { worker }] = await Promise.all(
    [
      getPipelineStatus(experimentId, constants.GEM2S_PROCESS_NAME),
      getPipelineStatus(experimentId, constants.QC_PROCESS_NAME),
      getPipelineStatus(experimentId, constants.SEURAT_PROCESS_NAME),
      getWorkerStatus(experimentId),
    ],
  );

  const formattedResponse = {
    [constants.OLD_QC_NAME_TO_BE_REMOVED]: qc,
    gem2s,
    seurat,
    worker,
  };

  return formattedResponse;
};

module.exports = getExperimentBackendStatus;
