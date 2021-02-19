const AWSMock = require('aws-sdk-mock');
const _ = require('lodash');
const AWS = require('../../../src/utils/requireAWS');

const createPipeline = require('../../../src/api/general-services/pipeline-manage');

describe('tests for the experiment service', () => {
  afterEach(() => {
    AWSMock.restore('EKS');
    AWSMock.restore('StepFunctions');
  });

  it('Create pipeline works', async () => {
    AWSMock.setSDKInstance(AWS);

    const mockCluster = {
      cluster: {
        name: 'biomage-test',
        endpoint: 'https://test-endpoint.me/fgh',
        certificateAuthority: {
          data: 'AAAAAAAAAAA',
        },
      },
    };

    const describeClusterSpy = jest.fn((x) => x);
    AWSMock.mock('EKS', 'describeCluster', (params, callback) => {
      describeClusterSpy(params);
      callback(null, mockCluster);
    });

    const createStateMachineSpy = jest.fn((stateMachineObject) => _.omit(stateMachineObject, 'definition'));
    AWSMock.mock('StepFunctions', 'createStateMachine', (params, callback) => {
      createStateMachineSpy(params);
      callback(null, { stateMachineArn: 'test-machine' });
    });

    const startExecutionSpy = jest.fn((x) => x);
    AWSMock.mock('StepFunctions', 'startExecution', (params, callback) => {
      startExecutionSpy(params);
      callback(null, { executionArn: 'test-machine' });
    });


    await createPipeline('testExperimentId');
    expect(describeClusterSpy).toMatchSnapshot();
    expect(createStateMachineSpy.mock.results).toMatchSnapshot();

    expect(startExecutionSpy).toHaveBeenCalled();
    expect(startExecutionSpy.mock.results).toMatchSnapshot();
  });

  it('Pipeline is updated instead of created if an error is thrown.', async () => {
    AWSMock.setSDKInstance(AWS);

    const mockCluster = {
      cluster: {
        name: 'biomage-test',
        endpoint: 'https://test-endpoint.me/fgh',
        certificateAuthority: {
          data: 'AAAAAAAAAAA',
        },
      },
    };

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

    const startExecutionSpy = jest.fn((x) => x);
    AWSMock.mock('StepFunctions', 'startExecution', (params, callback) => {
      startExecutionSpy(params);
      callback(null, { executionArn: 'test-execution' });
    });

    await createPipeline('testExperimentId');
    expect(describeClusterSpy).toMatchSnapshot();
    expect(createStateMachineSpy.mock.results).toMatchSnapshot();

    expect(updateStateMachineSpy).toHaveBeenCalled();
    expect(updateStateMachineSpy.mock.results).toMatchSnapshot();

    expect(startExecutionSpy).toHaveBeenCalled();
    expect(startExecutionSpy.mock.results).toMatchSnapshot();
  });
});
