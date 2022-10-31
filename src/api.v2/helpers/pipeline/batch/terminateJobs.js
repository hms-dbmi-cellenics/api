const AWS = require('../../../../utils/requireAWS');

const terminateJobs = async (jobsToTerminate, region) => {
  const batch = new AWS.Batch({ region });

  console.log('jobsToTerminate', jobsToTerminate);
  const promisesToTerminate = jobsToTerminate.map(async (job) => {
    const params = {
      jobId: job.jobId,
      reason: 'overwritten by new pipeline',
    };

    console.log('terminating: ', job.jobId);
    return batch.terminateJob(params).promise();
  });

  await Promise.all(promisesToTerminate);
};



module.exports = terminateJobs;
