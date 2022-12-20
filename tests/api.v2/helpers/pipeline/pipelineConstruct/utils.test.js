const _ = require('lodash');
const AWSMock = require('aws-sdk-mock');
const AWS = require('../../../../../src/utils/requireAWS');

const { createNewStateMachine, cancelPreviousPipelines } = require('../../../../../src/api.v2/helpers/pipeline/pipelineConstruct/utils');
const { deleteExperimentPods } = require('../../../../../src/api.v2/helpers/pipeline/hooks/podCleanup');
const listJobsToDelete = require('../../../../../src/api.v2/helpers/pipeline/batch/listJobsToDelete');
const terminateJobs = require('../../../../../src/api.v2/helpers/pipeline/batch/terminateJobs');
const config = require('../../../../../src/config');

const getLogger = require('../../../../../src/utils/getLogger');

const mockCluster = {
  cluster: {
    name: 'biomage-test',
    endpoint: 'https://test-endpoint.me/fgh',
    certificateAuthority: {
      data: 'AAAAAAAAAAA',
    },
  },
};

jest.mock('../../../../../src/utils/getLogger');
jest.mock('../../../../../src/api.v2/helpers/pipeline/hooks/podCleanup');
jest.mock('../../../../../src/api.v2/helpers/pipeline/batch/listJobsToDelete');
jest.mock('../../../../../src/api.v2/helpers/pipeline/batch/terminateJobs');

describe('utils', () => {
  describe('createNewStateMachine', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterEach(() => {
      AWSMock.restore('EKS');
      AWSMock.restore('StepFunctions');
    });

    it('State machine is updated instead of created if it already exists.', async () => {
      AWSMock.setSDKInstance(AWS);

      const describeClusterSpy = jest.fn((x) => x);
      AWSMock.mock('EKS', 'describeCluster', (params, callback) => {
        describeClusterSpy(params);
        callback(null, mockCluster);
      });

      const createStateMachineSpy = jest.fn((stateMachineObject) => _.omit(stateMachineObject, 'definition'));
      AWSMock.mock('StepFunctions', 'createStateMachine', (params, callback) => {
        createStateMachineSpy(params);
        callback({ code: 'StateMachineAlreadyExists' }, null);
      });

      const updateStateMachineSpy = jest.fn((stateMachineObject) => _.omit(stateMachineObject, 'definition'));
      AWSMock.mock('StepFunctions', 'updateStateMachine', (params, callback) => {
        updateStateMachineSpy(params);
        callback(null, { stateMachineArn: 'test-machine' });
      });

      const context = { experimentId: 'mockExperimentId', roleArn: 'mockRoleArn', accountId: 'mockAccountId' };
      const stateMachineArn = 'mockStateMachineArn';

      await createNewStateMachine(context, stateMachineArn, 'SomePipelineName');

      expect(describeClusterSpy).toMatchSnapshot();
      expect(createStateMachineSpy.mock.results).toMatchSnapshot();

      expect(updateStateMachineSpy).toHaveBeenCalled();
      expect(updateStateMachineSpy.mock.results).toMatchSnapshot();
    });
  });

  describe('cancelPreviousPipelines', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('Works', async () => {
      const mockExperimentId = 'mockExperimentId';
      const mockPreviousJobId = 'mockPreviousJobId';

      deleteExperimentPods.mockImplementationOnce(() => Promise.resolve());
      listJobsToDelete.mockImplementationOnce(() => Promise.resolve(['job-1', 'job-2']));
      terminateJobs.mockImplementationOnce(() => Promise.resolve());

      await cancelPreviousPipelines(mockExperimentId, mockPreviousJobId);

      expect(listJobsToDelete).toHaveBeenCalledWith(
        mockExperimentId,
        config.clusterEnv,
        config.awsRegio,
        mockPreviousJobId,
      );
      expect(terminateJobs).toHaveBeenCalled();
    });

    it('Handles delete experiment pods failing correctly but continues', async () => {
      const mockExperimentId = 'mockExperimentId';
      const mockPreviousJobId = 'mockPreviousJobId';

      const mockError = new Error('Failed');

      deleteExperimentPods.mockImplementationOnce(() => Promise.reject(mockError));
      listJobsToDelete.mockImplementationOnce(() => Promise.resolve(['job-1', 'job-2']));
      terminateJobs.mockImplementationOnce(() => Promise.resolve());

      await cancelPreviousPipelines(mockExperimentId, mockPreviousJobId);

      expect(getLogger().error).toHaveBeenCalledWith(`cancelPreviousPipelines: deleteExperimentPods ${mockExperimentId}: ${mockError}`);

      expect(listJobsToDelete).toHaveBeenCalledWith(
        mockExperimentId,
        config.clusterEnv,
        config.awsRegio,
        mockPreviousJobId,
      );
      expect(terminateJobs).toHaveBeenCalled();
    });
  });
});
