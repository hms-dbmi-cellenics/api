const AWS = require('../../../../utils/requireAWS');

// terminateJobs will terminate a list of AWS Batch jobs
// without taking into account the job status
const terminateJobs = async (jobsToTerminate, region) => {
  const batch = new AWS.Batch({ region });

  const promisesToTerminate = jobsToTerminate.map(async (job) => {
    const params = {
      jobId: job.jobId,
      reason: 'overwritten by new pipeline',
    };

    return batch.terminateJob(params).promise();
  });

  await Promise.all(promisesToTerminate);
};


module.exports = terminateJobs;
