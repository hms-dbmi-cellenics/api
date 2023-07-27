// Pipeline names
const QC_PROCESS_NAME = 'qc';
const GEM2S_PROCESS_NAME = 'gem2s';
const SEURAT_PROCESS_NAME = 'seurat';
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

const PUBLIC_ACCESS_ID = '00000000-0000-0000-0000-000000000000';

module.exports = {
  QC_PROCESS_NAME,
  GEM2S_PROCESS_NAME,
  SEURAT_PROCESS_NAME,
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
  PUBLIC_ACCESS_ID,
};
