
const k8s = require('@kubernetes/client-node');
const constants = require('../../../../src/api/services/pipelines/manage/pipelineConstants');
const fake = require('../../../test-utils/constants');
const { buildPodRequest } = require('../../../../src/api/services/pipelines/manage/constructors/buildPodRequest');

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

const pipelineAssign = require('../../../../src/utils/hooks/assignPodToPipeline');

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
    expect(listNamespacedPod).toHaveBeenNthCalledWith(1,
      expect.stringContaining(fake.SANDBOX_ID), null, null, null, null,
      expect.stringContaining(fake.EXPERIMENT_ID));

    expect(deleteNamespacedPod).toHaveBeenCalledTimes(2);
    // check that pod name & sandbox ID are correctly passed into k8s
    expect(deleteNamespacedPod).toHaveBeenNthCalledWith(1,
      expect.stringContaining('pipeline-X1'),
      expect.stringContaining(fake.SANDBOX_ID));

    expect(patchNamespacedPod).toHaveBeenCalledTimes(1);
    // check that pod name & sandbox ID are correctly passed into k8s
    expect(patchNamespacedPod).toHaveBeenNthCalledWith(1,
      expect.stringContaining('pipeline-X1'),
      expect.stringContaining(fake.SANDBOX_ID),
      expect.anything(),
      undefined, undefined, undefined, undefined,
      expect.anything());
  });


  it('ignores message because it is not a pod request', async () => {
    const message = { input: {} };

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
