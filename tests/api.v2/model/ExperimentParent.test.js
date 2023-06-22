const ExperimentParent = require('../../../src/api.v2/model/ExperimentParent');
const BasicModel = require('../../../src/api.v2/model/BasicModel');

const experimentId = 'mockExperimentId';


describe('ExperimentParent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('isSubset is false when findOne is undefined (it has no parent)', async () => {
    const mockFindOne = jest.spyOn(BasicModel.prototype, 'findOne')
      .mockImplementationOnce(() => Promise.resolve(undefined));

    const isSubset = await new ExperimentParent().isSubset(experimentId);

    expect(isSubset).toEqual(false);

    expect(mockFindOne).toBeCalledWith({ experiment_id: experimentId });
  });

  it('isSubset is true when experiment has a parent', async () => {
    const mockFindOne = jest.spyOn(BasicModel.prototype, 'findOne')
      .mockImplementationOnce(() => Promise.resolve({
        experimentId,
        parentExperimentId: 'parentExperimentId',
      }));

    const isSubset = await new ExperimentParent().isSubset(experimentId);

    expect(isSubset).toEqual(true);

    expect(mockFindOne).toBeCalledWith({ experiment_id: experimentId });
  });

  it('copyTo works correctly when the experiment has a parent', async () => {
    const fromExperimentId = 'fromExperimentId';
    const toExperimentId = 'toExperimentId';

    const mockFindOne = jest.spyOn(BasicModel.prototype, 'findOne')
      .mockImplementationOnce(() => Promise.resolve({
        experimentId: fromExperimentId,
        parentExperimentId: 'parentExperimentId',
      }));

    const mockCreate = jest.spyOn(BasicModel.prototype, 'create').mockImplementationOnce(() => Promise.resolve());

    await new ExperimentParent().copyTo(fromExperimentId, toExperimentId);

    expect(mockFindOne).toBeCalledWith({ experiment_id: fromExperimentId });
    expect(mockCreate).toBeCalledWith({ experiment_id: toExperimentId, parent_experiment_id: 'parentExperimentId' });
  });

  it('copyTo works correctly when the experiment doesnt have a parent', async () => {
    const fromExperimentId = 'fromExperimentId';
    const toExperimentId = 'toExperimentId';

    const mockFindOne = jest.spyOn(BasicModel.prototype, 'findOne')
      .mockImplementationOnce(() => Promise.resolve(undefined));

    const mockCreate = jest.spyOn(BasicModel.prototype, 'create');

    await new ExperimentParent().copyTo(fromExperimentId, toExperimentId);

    expect(mockFindOne).toBeCalledWith({ experiment_id: fromExperimentId });
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
