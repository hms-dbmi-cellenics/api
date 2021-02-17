const { exportContext } = require('@kubernetes/client-node/dist/config_types');
const AWS = require('aws-sdk');
const AWSMock = require('aws-sdk-mock');
const _ = require('lodash');

const PipelinesService = require('../../../src/api/route-services/pipelines');

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
      console.log(params);
      createStateMachineSpy(params);
      callback(null, { stateMachineArn: 'test-machine' });
    });

    const p = new PipelinesService();

    await p.create('testExperimentId');
    expect(describeClusterSpy).toMatchSnapshot();
    expect(createStateMachineSpy.mock.results).toMatchSnapshot();
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
      console.log(params);
      createStateMachineSpy(params);
      callback({ code: 'StateMachineAlreadyExists' }, null);
    });

    const updateStateMachineSpy = jest.fn((stateMachineObject) => _.omit(stateMachineObject, 'definition'));
    AWSMock.mock('StepFunctions', 'updateStateMachine', (params, callback) => {
      console.log(params);
      updateStateMachineSpy(params);
      callback(null, { stateMachineArn: 'test-machine' });
    });

    const p = new PipelinesService();

    await p.create('testExperimentId');
    expect(describeClusterSpy).toMatchSnapshot();
    expect(createStateMachineSpy.mock.results).toMatchSnapshot();

    expect(updateStateMachineSpy).toHaveBeenCalled();
    expect(updateStateMachineSpy.mock.results).toMatchSnapshot();
  });
});
