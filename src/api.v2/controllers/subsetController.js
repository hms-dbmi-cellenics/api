// const AWSXRay = require('aws-xray-sdk');

const sqlClient = require('../../sql/sqlClient');
const getLogger = require('../../utils/getLogger');

const { createSubsetPipeline } = require('../helpers/pipeline/pipelineConstruct');
const Experiment = require('../model/Experiment');
const UserAccess = require('../model/UserAccess');

const logger = getLogger('[SubsetController] - ');

const runSubset = async (req, res) => {
  const { experimentId } = req.params;

  logger.log(`Starting subset for experiment ${experimentId}`);


  const {
    params: { experimentId: fromExperimentId },
    body: {
      name,
      cellSetKeys,
    },
    user: { sub: userId },
  } = req;

  logger.log(`Creating experiment to subset ${fromExperimentId}`);

  let toExperimentId;
  await sqlClient.get().transaction(async (trx) => {
    toExperimentId = await new Experiment(trx).createCopy(fromExperimentId, name, false);
    await new UserAccess(trx).createNewExperimentPermissions(userId, toExperimentId);
  });

  // const clonedSamplesOrder = await new Sample()
  //   .copyTo(fromExperimentId, toExperimentId, samplesToCloneIds);

  logger.log(`Created ${toExperimentId}, subsetting experiment ${fromExperimentId} to it`);

  await createSubsetPipeline(fromExperimentId, toExperimentId, cellSetKeys);

  res.json(toExperimentId);

  // await createQCPipeline(
  //   req.params.experimentId,
  //   processingConfig || [],
  //   req.headers.authorization,
  // );

  logger.log(`Started subset for experiment ${experimentId} successfully, `);

  res.json(toExperimentId);
};

const handleResponse = async () => {
  // const handleResponse = async (req, res) => {
  // let result;

  // try {
  //   result = await parseSNSMessage(req, snsTopics.WORK_RESULTS);
  // } catch (e) {
  //   logger.error('Parsing initial SNS message failed:', e);
  //   AWSXRay.getSegment().addError(e);
  //   res.status(200).send('nok');
  //   return;
  // }

  // const { io, parsedMessage } = result;

  // const isSnsNotification = parsedMessage !== undefined;
  // if (isSnsNotification) {
  //   try {
  //     await handleQCResponse(io, parsedMessage);
  //   } catch (e) {
  //     logger.error(
  //       'qc pipeline response handler failed with error: ', e,
  //     );

  //     AWSXRay.getSegment().addError(e);
  //     res.status(200).send('nok');
  //     return;
  //   }
  // }

  // res.status(200).send('ok');
};

module.exports = {
  runSubset,
  handleResponse,
};
