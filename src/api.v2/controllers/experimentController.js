/* eslint-disable import/prefer-default-export */
const experiment = require('../model/experiment');

const { OK } = require('../../utils/responses');


// const getExperimentDetails = (req, res, next) => {
//   const { params: { experimentId } } = req;

//   const a = ['experimentId', 'experimentName', 'sampleIds'];

//   // const data = await getExperimentAttributes(this.experimentsTableName, experimentId,
//   // ['projectId', 'meta', 'experimentId', 'experimentName', 'sampleIds', 'notifyByEmail']);
//   // return data;

//   // res.json(data);
// };

// const experiment = 'experiment';

const createExperiment = async (req, res) => {
  console.log('HOASLFKSDMFDSL');
  // const { params: { experimentId }, body, user } = req;
  const { params: { experimentId }, body } = req;

  const { name, description } = body;

  await experiment.create(experimentId, name, description);

  res.json(OK());
};

module.exports = {
  // getExperimentDetails,
  createExperiment,
};
