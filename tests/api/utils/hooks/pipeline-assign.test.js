const k8s = require('@kubernetes/client-node');
const constants = require('../../../../src/api/general-services/pipeline-manage/constants');
const fake = require('../../../test-utils/constants');

const { buildPodRequest } = require('../../../../src/api/general-services/pipeline-manage/constructors/assign-pod-to-pipeline');

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

jest.mock('@kubernetes/client-node');

const removeNamespacedPod = jest.fn();
const patchNamespacedPod = jest.fn();
const listNamespacedPod = jest.fn(() => (mockPodsList));


describe('tests for the pipeline-assign service', () => {
  // const kc = new k8s.KubeConfig();
  // kc.loadFromDefault();
  // const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  const mockApi = {
    removeNamespacedPod,
    patchNamespacedPod,
    listNamespacedPod,
  };

  k8s.KubeConfig.mockImplementation(() => {
    console.debug('mocking the constructor');
    return {
      loadFromDefault: jest.fn(),
      makeApiClient: jest.fn(() => mockApi),
    };
  });

  const pipelineAssign = require('../../../../src/utils/hooks/pipeline-assign');


  it('calls delete for every assigned pod', async () => {
    const message = buildPodRequest(fake.SANDBOX_ID,
      fake.EXPERIMENT_ID,
      constants.ASSIGN_POD_TO_PIPELINE,
      constants.GEM2S_PROCESS_NAME,
      fake.ACTIVITY_ID);

    pipelineAssign.assignPodToPipeline(message);

    expect(patchNamespacedPod).toHaveBeenCalledTimes(1);
    expect(listNamespacedPod).toHaveBeenCalledTimes(2);
    expect(removeNamespacedPod).toHaveBeenCalledTimes(2);
  });


  it('ignores message because it is not a pod request', async () => {
    const message = {};

    await pipelineAssign.assignPodToPipeline(message);

    expect(listNamespacedPod).toHaveBeenCalledTimes(0);
    expect(removeNamespacedPod).toHaveBeenCalledTimes(0);
    expect(patchNamespacedPod).toHaveBeenCalledTimes(0);
  });

  it('throws exception on invalid message', async () => {
    const message = { taskName: constants.ASSIGN_POD_TO_PIPELINE };

    await expect(pipelineAssign.assignPodToPipeline(message)).rejects.toThrow();
  });
});
