const updatePipelineVersion = require('../../../../../src/api.v2/helpers/pipeline/hooks/updatePipelineVersion');
const Experiment = require('../../../../../src/api.v2/model/Experiment');

jest.mock('../../../../../src/api.v2/model/Experiment');

const message = {
  experimentId: 'mockexp',
  input: {
    authJWT: 'somejwt',
    processName: 'gem2s',
    taskName: 'task1',
  },
  pipelineVersion: 2,
};

const experimentInstance = new Experiment();

describe('updatePipelineVersion', () => {
  it('Works correctly', async () => {
    experimentInstance.updateById.mockImplementationOnce(() => Promise.resolve({}));

    await updatePipelineVersion(message);

    expect(experimentInstance.updateById).toHaveBeenCalledTimes(1);
    expect(experimentInstance.updateById.mock.calls).toMatchSnapshot();
  });
});
