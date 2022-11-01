const AWS = require('../../../../utils/requireAWS');

const SUCCEEDED = 'SUCCEEDED';
const FAILED = 'FAILED';

// listActiveJobs returns a list of the 'active' jobs for an experiment
// all jobs that are not 'succeeded' or 'failed' are considered active
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

  const resp = await batch.listJobs(input).promise();
  return resp.jobSummaryList.filter((job) => job.status !== SUCCEEDED && job.status !== FAILED);
};

module.exports = listActiveJobs;
