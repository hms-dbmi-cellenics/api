
const k8s = require('@kubernetes/client-node');
const constants = require('../../../../src/api/general-services/pipeline-manage/constants');
const fake = require('../../../test-utils/constants');

const { buildPodRequest } = require('../../../../src/api/general-services/pipeline-manage/constructors/assign-pod-to-pipeline');

jest.mock('@kubernetes/client-node');

const mockEmptyPodsList = {
  body: {
    items: [],
  },
};

const deleteNamespacedPod = jest.fn();
const patchNamespacedPod = jest.fn();
const listNamespacedPod = jest.fn(() => mockEmptyPodsList);
const mockApi = {
  deleteNamespacedPod,
  patchNamespacedPod,
  listNamespacedPod,
};

k8s.KubeConfig.mockImplementation(() => {
  console.debug('mocking the constructor');
  return {
    loadFromDefault: jest.fn(),
    makeApiClient: (() => mockApi),
  };
});

const pipelineAssign = require('../../../../src/utils/hooks/pipeline-assign');

describe('tests for the pipeline-assign service', () => {
  it('does not call delete because there are not assigned pods', async () => {
    const message = buildPodRequest(fake.SANDBOX_ID,
      fake.EXPERIMENT_ID,
      constants.ASSIGN_POD_TO_PIPELINE,
      constants.GEM2S_PROCESS_NAME,
      fake.ACTIVITY_ID);

    await pipelineAssign.assignPodToPipeline(message);

    // TODO reenable before merging
    // expect(listNamespacedPod).toHaveBeenCalledTimes(2);
    expect(deleteNamespacedPod).toHaveBeenCalledTimes(0);
    expect(patchNamespacedPod).toHaveBeenCalledTimes(0);
  });
});
