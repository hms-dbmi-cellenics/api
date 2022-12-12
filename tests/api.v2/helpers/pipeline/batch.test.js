const listJobsToDelete = require('../../../../src/api.v2/helpers/pipeline/batch/listJobsToDelete');
const terminateJobs = require('../../../../src/api.v2/helpers/pipeline/batch/terminateJobs');
const fake = require('../../../test-utils/constants');
const { mockBatchTerminateJob, mockBatchListJobs } = require('../../../test-utils/mockAWSServices');


const listOfJobs = [
  {
    jobArn: 'arn:aws:batch:eu-west-1:cccc:job/7596ed1d-a622-4a65-b5b2-79e1a6988036',
    jobId: '7596ed1d-a622-4a65-b5b2-79e1a6988036',
    jobName: `production-${fake.EXPERIMENT_ID}-qc`,
    createdAt: 1667138764290,
    status: 'RUNNABLE',
    stoppedAt: 1667141730938,
    container: [Object],
    jobDefinition: 'arn:aws:batch:eu-west-1:ccccc:job-definition/job-pipeline-production:2',
  },
  {
    jobArn: 'arn:aws:batch:eu-west-1:ccccc:job/a6d49c90-74f0-4c1e-aa8f-673312b6eb7d',
    jobId: 'a6d49c90-74f0-4c1e-aa8f-673312b6eb7d',
    jobName: `production-${fake.EXPERIMENT_ID}-qc`,
    createdAt: 1667133293413,
    status: 'FAILED',
    stoppedAt: 1667137362912,
    container: [Object],
    jobDefinition: 'arn:aws:batch:eu-west-1:cccc:job-definition/job-pipeline-production:2',
  },
  {
    jobArn: 'arn:aws:batch:eu-west-1:ccccc:job/a6d49c90-74f0-4c1e-aa8f-673312b6eb7d',
    jobId: 'a6d49c90-74f0-4c1e-aa8f-673312b6eb7d',
    jobName: `production-${fake.EXPERIMENT_ID}-qc`,
    createdAt: 1667133293413,
    status: 'SUCCEEDED',
    stoppedAt: 1667137362912,
    container: [Object],
    jobDefinition: 'arn:aws:batch:eu-west-1:cccc:job-definition/job-pipeline-production:2',
  },
  {
    jobArn: 'arn:aws:batch:eu-west-1:ccccc:job/a6d49c90-74f0-4c1e-aa8f-673312b6eb7d',
    jobId: 'a6d49c90-74f0-4c1e-aa8f-673312b6eb7d',
    jobName: `production-${fake.EXPERIMENT_ID}-qc`,
    createdAt: 1667133293413,
    status: 'STARTING',
    stoppedAt: 1667137362912,
    container: [Object],
    jobDefinition: 'arn:aws:batch:eu-west-1:cccc:job-definition/job-pipeline-production:2',
  },
];

describe('listJobsToDelete', () => {
  const spy = mockBatchListJobs({ jobSummaryList: listOfJobs });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns only active jobs', async () => {
    const jobs = await listJobsToDelete(fake.EXPERIMENT_ID, 'production', 'eu-west-1');
    expect(jobs.length).toEqual(2);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('filters out also previous jobId', async () => {
    const jobs = await listJobsToDelete(fake.EXPERIMENT_ID, 'production', 'eu-west-1', '7596ed1d-a622-4a65-b5b2-79e1a6988036');
    expect(jobs.length).toEqual(1);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('terminateJobs', () => {
  it('terminates the jobs in the list', async () => {
    const spy = mockBatchTerminateJob({});

    await terminateJobs(listOfJobs, 'eu-west-1');
    expect(spy).toHaveBeenCalledTimes(4);
  });
});
