// @ts-nocheck
const subsetController = require('../../../src/api.v2/controllers/subsetController');

const Experiment = require('../../../src/api.v2/model/Experiment');
const UserAccess = require('../../../src/api.v2/model/UserAccess');

const pipelineConstruct = require('../../../src/api.v2/helpers/pipeline/pipelineConstruct/index');
const ExperimentExecution = require('../../../src/api.v2/model/ExperimentExecution');
const ExperimentParent = require('../../../src/api.v2/model/ExperimentParent');
const { GEM2S_PROCESS_NAME } = require('../../../src/api.v2/constants');

const { mockSqlClient } = require('../mocks/getMockSqlClient')();

const mockExperimentRow = require('../mocks/data/experimentRow.json');
const Sample = require('../../../src/api.v2/model/Sample');

jest.mock('../../../src/api.v2/model/Experiment');
jest.mock('../../../src/api.v2/model/Sample');
jest.mock('../../../src/api.v2/model/ExperimentExecution');
jest.mock('../../../src/api.v2/model/ExperimentParent');
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
const sampleInstance = Sample();
const userAccessInstance = UserAccess();
const experimentExecutionInstance = ExperimentExecution();
const experimentParentInstance = ExperimentParent();

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

    const newExecution = { stateMachineArn: 'mockStateMachineArn', executionArn: 'mockExecutionArn' };

    const mockExperimentSampleRow = {
      id: 'sample1',
      experimentId: mockExperimentRow.id,
      name: 'firstSample',
      sampleTechnology: '10x',
    };

    experimentInstance.createCopy.mockImplementationOnce(() => Promise.resolve(childExperimentId));

    experimentInstance.findById.mockReturnValueOnce(
      { first: () => Promise.resolve(mockExperimentRow) },
    );

    sampleInstance.find.mockReturnValue(
      { first: () => Promise.resolve(mockExperimentSampleRow) },
    );

    pipelineConstruct.createSubsetPipeline.mockImplementationOnce(
      () => Promise.resolve(newExecution),
    );

    await subsetController.handleSubsetRequest(mockReq, mockRes);

    const mockParams = {
      experimentId: parentExperimentId,
      name: mockReq.body.name,
      cellSetKeys: mockReq.body.cellSetKeys,
      userId: mockReq.user.sub,
      subsetExperimentId: childExperimentId,
    };

    const mockNewExecution = {
      state_machine_arn: newExecution.stateMachineArn,
      execution_arn: newExecution.executionArn,
    };

    expect(experimentExecutionInstance.updateExecution).toHaveBeenCalledWith(
      childExperimentId,
      GEM2S_PROCESS_NAME,
      mockNewExecution,
      mockParams,
    );

    expect(experimentParentInstance.create).toHaveBeenCalledWith({
      experiment_id: childExperimentId, parent_experiment_id: parentExperimentId,
    });

    expect(userAccessInstance.createNewExperimentPermissions)
      .toHaveBeenCalledWith(mockReq.user.sub, childExperimentId);

    expect(pipelineConstruct.createSubsetPipeline)
      .toHaveBeenCalledWith(
        parentExperimentId,
        childExperimentId,
        mockParams.name,
        mockParams.cellSetKeys,
        mockExperimentRow.processingConfig,
        mockExperimentSampleRow.sampleTechnology,
        mockReq.headers.authorization,
      );

    // Response is ok
    expect(mockRes.json).toHaveBeenCalledWith(childExperimentId);
  });
});
