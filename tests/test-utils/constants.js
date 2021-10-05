const CELL_SIZE_PROCESSING_CONFIG = {
  cellSizeDistribution: {
    sampleId: {
      auto: true,
      filterSettings: { binStep: 200, minCellSize: 420 },
      defaultFilterSettings: { binStep: 200, minCellSize: 420 },
    },
    enabled: true,
  },
};

const S3_WORKER_RESULT = {
  config: {
    auto: true,
    filterSettings: {
      probabilityThreshold: 0.7622447,
      binStep: 0.05,
    },
    enabled: true,
    defaultFilterSettings: {
      probabilityThreshold: 0.7622447,
      binStep: 0.05,
    },
    api_url: 'http://api-url-to-our-url.api-to.etc.local:3000',
    auth_JWT: 'Bearer Im your token man',
  },
  plotDataKeys: {
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-doubletScores-0': '11111111-2222-3333-4444-5555555555555',
  },
  plotData: {
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-doubletScores-0': [
      {
        doubletP: 0.268412,
      },
    ],
    '11111111-2222-3333-4444-5555555555555': {
      before: {
        num_cells: 864,
        total_genes: 12467,
        median_genes: 1390.5,
        median_umis: 3485,
      },
      after: {
        num_cells: 848,
        total_genes: 12467,
        median_genes: 1386,
        median_umis: 3466,
      },
    },
  },
};

// Try to use realistic values but DO NOT USE real ones.
module.exports = Object.freeze({
  EXPERIMENT_ID: 'experimentid11111111111111111111',
  S3_BUCKET: 'worker-results-test',
  S3_KEY: '11111122222233333344444455555555',
  SAMPLE_UUID: 'aaaaaaaa-bbbb-3333-4444-999999999999',
  SANDBOX_ID: 'default',
  REGION: 'eu-east-9',
  AWS_ACCOUNT_ID: '111111111111',
  ACTIVITY_ID: 'arn:aws:states:eu-east-9:111111111111:activity:biomage-gem2s-production-39249897-cfce-632b-a617-e58fbf251733',
  CELL_SIZE_PROCESSING_CONFIG,
  S3_WORKER_RESULT,
});
