// @ts-nocheck
const subsetController = require('../../../src/api.v2/controllers/subsetController');

const Experiment = require('../../../src/api.v2/model/Experiment');
const UserAccess = require('../../../src/api.v2/model/UserAccess');

const pipelineConstruct = require('../../../src/api.v2/helpers/pipeline/pipelineConstruct/index');

const { mockSqlClient } = require('../mocks/getMockSqlClient')();

jest.mock('../../../src/api.v2/model/Experiment');
jest.mock('../../../src/api.v2/model/UserAccess');
jest.mock('../../../src/api.v2/helpers/pipeline/pipelineConstruct/index');
jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));

const mockJsonSend = jest.fn();
const mockRes = {
  json: jest.fn(),
  status: jest.fn(() => ({ send: mockJsonSend })),
};

const experimentInstance = Experiment();
const userAccessInstance = UserAccess();

describe('subsetController', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('runSubset works correctly', async () => {
    const parentExperimentId = 'parentExperimentId';
    const mockReq = {
      params: { experimentId: parentExperimentId },
      headers: { authorization: 'mockAuthorization' },
      body: {
        name: 'newExperimentName',
        cellSetKeys: ['louvain-0', 'sample1-id'],
      },
      user: {
        sub: 'mockSub',
      },
    };

    const childExperimentId = 'childExperimentId';

    experimentInstance.createCopy.mockImplementationOnce(() => Promise.resolve(childExperimentId));
    pipelineConstruct.createSubsetPipeline.mockImplementationOnce(() => Promise.resolve());

    await subsetController.runSubset(mockReq, mockRes);

    expect(userAccessInstance.createNewExperimentPermissions)
      .toHaveBeenCalledWith(mockReq.user.sub, childExperimentId);

    expect(pipelineConstruct.createSubsetPipeline)
      .toHaveBeenCalledWith(
        parentExperimentId,
        childExperimentId,
        mockReq.body.name,
        mockReq.body.cellSetKeys,
        mockReq.headers.authorization,
      );

    // Response is ok
    expect(mockRes.json).toHaveBeenCalledWith(childExperimentId);
  });
});
