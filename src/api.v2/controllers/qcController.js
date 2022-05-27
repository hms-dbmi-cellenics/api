// const { OK } = require('../../utils/responses');
const getLogger = require('../../utils/getLogger');
// const parseSNSMessage = require('../../utils/parse-sns-message');

const { createQCPipeline } = require('../helpers/pipeline/pipelineConstruct');

const logger = getLogger('[QCController] - ');

const getQCState = async () => {

};

const runQC = async (req, res) => {
  const { experimentId } = req.params;
  const { processingConfig } = req.body;

  logger.log(`Starting qc for experiment ${experimentId}`);

  const data = await createQCPipeline(
    req.params.experimentId,
    processingConfig || [],
    req.headers.authorization,
  );

  // const experimentService = new ExperimentService();
  // await experimentService.saveQCHandle(req.params.experimentId, data);

  logger.log(`Started qc for experiment ${experimentId} successfully, `);

  res.json(data);
};

const handleResponse = async () => {

};

module.exports = {
  getQCState,
  runQC,
  handleResponse,
};
