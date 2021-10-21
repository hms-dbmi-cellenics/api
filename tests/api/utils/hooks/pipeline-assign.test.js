
const k8s = require('@kubernetes/client-node');
const constants = require('../../../../src/api/general-services/pipeline-manage/constants');
const fake = require('../../../test-utils/constants');
const { buildPodRequest } = require('../../../../src/api/general-services/pipeline-manage/constructors/assign-pod-to-pipeline');

jest.mock('@kubernetes/client-node');

const mockPodsList = {
  body: {
    items: [
      {
        metadata: {
          name: 'pipeline-X1',
          generateName: 'pipeline-fasdfasdf-',
          namespace: 'pipeline-X',
        },
      },
      {
        metadata: {
          name: 'pipeline-X2',
          generateName: 'pipeline-2342fasd-',
          namespace: 'pipeline-X',
        },
      },
    ],
  },
};

const deleteNamespacedPod = jest.fn();
const patchNamespacedPod = jest.fn();
const listNamespacedPod = jest.fn(() => mockPodsList);
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
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls delete for every assigned pod and patches the selected one', async () => {
    const message = buildPodRequest(fake.SANDBOX_ID,
      fake.EXPERIMENT_ID,
      constants.ASSIGN_POD_TO_PIPELINE,
      constants.GEM2S_PROCESS_NAME,
      fake.ACTIVITY_ID);

    await pipelineAssign.assignPodToPipeline(message);

    expect(listNamespacedPod).toHaveBeenCalledTimes(2);
    expect(deleteNamespacedPod).toHaveBeenCalledTimes(2);
    expect(patchNamespacedPod).toHaveBeenCalledTimes(1);
  });


  it('ignores message because it is not a pod request', async () => {
    const message = {};

    await pipelineAssign.assignPodToPipeline(message);

    expect(listNamespacedPod).toHaveBeenCalledTimes(0);
    expect(deleteNamespacedPod).toHaveBeenCalledTimes(0);
    expect(patchNamespacedPod).toHaveBeenCalledTimes(0);
  });


  it('throws exception on invalid message', async () => {
    const message = { taskName: constants.ASSIGN_POD_TO_PIPELINE };

    await expect(pipelineAssign.assignPodToPipeline(message)).rejects.toThrow();
  });
});
