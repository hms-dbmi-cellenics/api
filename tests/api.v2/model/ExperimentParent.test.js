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
});
