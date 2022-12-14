const _ = require('lodash');
const AWSMock = require('aws-sdk-mock');
const AWS = require('../../../../../src/utils/requireAWS');

const { createNewStateMachine } = require('../../../../../src/api.v2/helpers/pipeline/pipelineConstruct/utils');

const mockCluster = {
  cluster: {
    name: 'biomage-test',
    endpoint: 'https://test-endpoint.me/fgh',
    certificateAuthority: {
      data: 'AAAAAAAAAAA',
    },
  },
};

describe('createNewStateMachine', () => {
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
