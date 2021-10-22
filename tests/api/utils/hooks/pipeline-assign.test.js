
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

  it('calls delete & patch when there are already running pods', async () => {
    const message = buildPodRequest(fake.SANDBOX_ID,
      fake.EXPERIMENT_ID,
      constants.ASSIGN_POD_TO_PIPELINE,
      constants.GEM2S_PROCESS_NAME,
      fake.ACTIVITY_ID);

    await pipelineAssign.assignPodToPipeline(message);

    expect(listNamespacedPod).toHaveBeenCalledTimes(2);
    // check that sandbox ID, activity & selector are correctly passed into k8s
    expect(listNamespacedPod.mock.calls[0][0]).toContain(fake.SANDBOX_ID);
    expect(listNamespacedPod.mock.calls[0][4]).toEqual('status.phase=Running');
    expect(listNamespacedPod.mock.calls[0][5]).toContain(fake.ACTIVITY_ID);

    expect(deleteNamespacedPod).toHaveBeenCalledTimes(2);
    // check that pod name & sandbox ID are correctly passed into k8s
    expect(deleteNamespacedPod.mock.calls[0][0]).toEqual('pipeline-X1');
    expect(deleteNamespacedPod.mock.calls[0][1]).toContain(fake.SANDBOX_ID);

    expect(patchNamespacedPod).toHaveBeenCalledTimes(1);
    // check that pod name & sandbox ID are correctly passed into k8s
    expect(patchNamespacedPod.mock.calls[0][0]).toEqual('pipeline-X1');
    expect(patchNamespacedPod.mock.calls[0][1]).toContain(fake.SANDBOX_ID);
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
