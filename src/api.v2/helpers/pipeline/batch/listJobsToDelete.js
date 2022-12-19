const AWS = require('../../../../utils/requireAWS');

const SUCCEEDED = 'SUCCEEDED';
const FAILED = 'FAILED';

// listJobsToDelete returns a list of job to be deleted before
// running a new pipeline for an experiment
// all jobs that are not 'succeeded' or 'failed' are considered active
// jobs need some time to move into succedded status once they are done
// so in the case of QC we want to avoid canceling the previous gem2s job
// to avoid marking it as failed
const listJobsToDelete = async (experimentId, env, region, previousJobId) => {
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
  return resp.jobSummaryList.filter((job) => job.status !== SUCCEEDED
   && job.status !== FAILED
   && job.jobId !== previousJobId);
};

module.exports = listJobsToDelete;
