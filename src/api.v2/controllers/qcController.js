// const { OK } = require('../../utils/responses');
const AWSXRay = require('aws-xray-sdk');

const ExperimentExecution = require('../model/ExperimentExecution');

const { createQCPipeline } = require('../helpers/pipeline/pipelineConstruct');
const { handleQCResponse } = require('../helpers/pipeline/qc');

const getLogger = require('../../utils/getLogger');
const parseSNSMessage = require('../../utils/parse-sns-message');

const logger = getLogger('[QCController] - ');

const runQC = async (req, res) => {
  const { experimentId } = req.params;
  const { processingConfig } = req.body;

  logger.log(`Starting qc for experiment ${experimentId}`);

  const { stateMachineArn, executionArn } = await createQCPipeline(
    req.params.experimentId,
    processingConfig || [],
    req.headers.authorization,
  );

  await new ExperimentExecution().upsert(
    {
      experiment_id: experimentId,
      pipeline_type: 'qc',
    },
    {
      state_machine_arn: stateMachineArn,
      execution_arn: executionArn,
    },
  );

  logger.log(`Started qc for experiment ${experimentId} successfully, `);

  res.json({ stateMachineArn, executionArn });
};

const handleResponse = async (req, res) => {
  let result;

  try {
    result = await parseSNSMessage(req);
  } catch (e) {
    logger.error('Parsing initial SNS message failed:', e);
    AWSXRay.getSegment().addError(e);
    res.status(200).send('nok');
    return;
  }

  const { io, parsedMessage } = result;
  const isSnsNotification = parsedMessage !== undefined;
  if (isSnsNotification) {
    try {
      await handleQCResponse(io, parsedMessage);
    } catch (e) {
      logger.error(
        'pipeline response handler failed with error: ', e,
      );

      AWSXRay.getSegment().addError(e);
      res.status(200).send('nok');
      return;
    }
  }

  res.status(200).send('ok');
};

module.exports = {
  runQC,
  handleResponse,
};
