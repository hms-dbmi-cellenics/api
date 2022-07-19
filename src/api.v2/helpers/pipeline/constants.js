// Pipeline names
const QC_PROCESS_NAME = 'qc';
const GEM2S_PROCESS_NAME = 'gem2s';
const OLD_QC_NAME_TO_BE_REMOVED = 'pipeline';

const ASSIGN_POD_TO_PIPELINE = 'assignPodToPipeline';

// Pipeline states as defined in
// https://docs.aws.amazon.com/step-functions/latest/apireference/API_DescribeExecution.html
const RUNNING = 'RUNNING';
const FAILED = 'FAILED';
const TIMED_OUT = 'TIMED_OUT';
const ABORTED = 'ABORTED';
const SUCCEEDED = 'SUCCEEDED';

// Custom defined statuses defined in the API
const NOT_CREATED = 'NOT_CREATED';

// Error code returned when querying for the description of a state machine execution ARN
// which does not exist
// (barring unexpected errors, it happens when pulling or moving experiments across environments
// because the ARNs are not imported)
const EXECUTION_DOES_NOT_EXIST = 'ExecutionDoesNotExist';
const ACCESS_DENIED = 'AccessDeniedException';

// Custom date to return if execution history can no longer be found in StepFunctions
// because AWS deletes execution history more than 90 days after the execution is completed
const EXPIRED_EXECUTION_DATE = '2019-05-19T00:00:00.000Z';

const DOMAIN_NAME = {
  BIOMAGE: 'scp.biomage.net',
  BIOMAGE_STAGING: 'scp-staging.biomage.net',
  HMS: 'cellenics.hms.harvard.edu',
};

module.exports = {
  QC_PROCESS_NAME,
  GEM2S_PROCESS_NAME,
  OLD_QC_NAME_TO_BE_REMOVED,
  RUNNING,
  FAILED,
  TIMED_OUT,
  ABORTED,
  SUCCEEDED,
  NOT_CREATED,
  EXECUTION_DOES_NOT_EXIST,
  ACCESS_DENIED,
  ASSIGN_POD_TO_PIPELINE,
  EXPIRED_EXECUTION_DATE,
  DOMAIN_NAME,
};
