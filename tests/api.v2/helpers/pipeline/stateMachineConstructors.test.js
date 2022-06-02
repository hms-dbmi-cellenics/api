const constants = require('../../../../src/api.v2/helpers/pipeline/constants');
const fake = require('../../../test-utils/constants');
const { buildPodRequest } = require('../../../../src/api.v2/helpers/pipeline/pipelineConstruct/constructors/requestAssignPodToPipeline');
const validateRequest = require('../../../../src/utils/schema-validator');

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
