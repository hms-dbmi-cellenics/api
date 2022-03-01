const constants = require('../../../src/api/services/pipelines/manage/pipelineConstants');
const fake = require('../../test-utils/constants');
const { buildPodRequest } = require('../../../src/api/services/pipelines/manage/constructors/buildPodRequest');
const validateRequest = require('../../../src/utils/validateRequest');

describe('Test for pipeline constructor services', () => {
  it('builds valid pipeline pod assignation request', async () => {
    const message = buildPodRequest(fake.SANDBOX_ID,
      fake.EXPERIMENT_ID,
      constants.ASSIGN_POD_TO_PIPELINE,
      constants.GEM2S_PROCESS_NAME,
      fake.ACTIVITY_ID);

    await validateRequest(message, 'PipelinePodRequest.v1.yaml');
    expect(message).toMatchSnapshot();
  });
});
