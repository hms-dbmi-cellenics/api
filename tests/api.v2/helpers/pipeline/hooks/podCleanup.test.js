
const k8s = require('@kubernetes/client-node');
const fake = require('../../../../test-utils/constants');

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

const { cleanupPods } = require('../../../../../src/utils/hooks/pod-cleanup');


describe('cleanupPods', () => {
  it('calls delete pod for each element in the message', async () => {
    const message = {
      experimentId: fake.EXPERIMENT_ID,
    };
    await cleanupPods(message);
    expect(listNamespacedPod).toHaveBeenCalledTimes(1);
    expect(deleteNamespacedPod).toHaveBeenCalledTimes(2);
  });
});
