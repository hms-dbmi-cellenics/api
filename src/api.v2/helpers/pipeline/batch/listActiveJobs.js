const AWS = require('../../../../utils/requireAWS');

const SUCCEEDED = 'SUCCEEDED';
const FAILED = 'FAILED';

const listActiveJobs = async (experimentId, env, region) => {
  const batch = new AWS.Batch({ region });

  const input = {
    jobQueue: `queue-pipeline-${env}`,
    filters: [
      {
        name: 'JOB_NAME',
        values: [`${env}-${experimentId}-*`],
      },
    ],
  };
  const response = await batch.listJobs(input).promise();
  console.log('response', response);
  return response.jobSummaryList.filter((job) => job.status !== SUCCEEDED && job.status !== FAILED);
};

module.exports = listActiveJobs;
