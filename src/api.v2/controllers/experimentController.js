/* eslint-disable import/prefer-default-export */
const config = require('../../config');

const sqlClient = require('../../SQL/sqlClient');

const experiment = require('../model/experiment');

const { OK } = require('../../utils/responses');

const experimentsTableName = `experiments-${config.clusterEnv}`;
const cellSetsBucketName = `cell-sets-${config.clusterEnv}`;
const processedMatrixBucketName = `processed-matrix-${config.clusterEnv}`;
const rawSeuratBucketName = `biomage-source-${config.clusterEnv}`;
const filteredCellsBucketName = `biomage-filtered-cells-${config.clusterEnv}`;

const getExperimentDetails = (req, res, next) => {
  const { params: { experimentId } } = req;

  const a = ['experimentId', 'experimentName', 'sampleIds'];

  // const a = ['projectId', 'meta', 'experimentId', 'experimentName', 'sampleIds', 'notifyByEmail'];

  // const data = await getExperimentAttributes(this.experimentsTableName, experimentId,
  // ['projectId', 'meta', 'experimentId', 'experimentName', 'sampleIds', 'notifyByEmail']);
  // return data;

  // res.json(data);
};

// const experiment = 'experiment';

const createExperiment = async (req, res) => {
  // const { params: { experimentId }, body, user } = req;
  const { params: { experimentId }, body } = req;

  const { name, description } = body;

  await experiment.create(experimentId, name, description);

  res.json(OK());
};

export {
  getExperimentDetails,
  createExperiment,
};
