const _ = require('lodash');

// const Experiment = require('../model/Experiment');

const constants = require('../../utils/constants');
// const getPipelineStatus = require('./pipeline-status');
// const getWorkerStatus = require('./worker-status');

const getBackendStatus = async (experimentId) => {
  const [{ gem2s }, { qc }, { worker }] = await Promise.all(
    [
      getPipelineStatus(experimentId, constants.GEM2S_PROCESS_NAME),
      getPipelineStatus(experimentId, constants.QC_PROCESS_NAME),
      getWorkerStatus(experimentId)],
  );

  return {
    [constants.OLD_QC_NAME_TO_BE_REMOVED]: qc,
    gem2s,
    worker,
  };
};

module.exports = { getBackendStatus };
