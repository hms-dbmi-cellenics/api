const AWSMock = require('aws-sdk-mock');
const _ = require('lodash');
const AWS = require('../../../src/utils/requireAWS');

const createPipeline = require('../../../src/api/general-services/pipeline-manage');
const expectedDefinition = require('./expectedDefinition.json');

describe('test for pipeline services', () => {
  afterEach(() => {
    AWSMock.restore('EKS');
    AWSMock.restore('StepFunctions');
  });

  const MockProcessingConfig = {
    Item: {
      processingConfig: {
        M: {},
      },
    },
  };

  const mockCluster = {
    cluster: {
      name: 'biomage-test',
      endpoint: 'https://test-endpoint.me/fgh',
      certificateAuthority: {
        data: 'AAAAAAAAAAA',
      },
    },
  };

  it('Create pipeline works', async () => {
    AWSMock.setSDKInstance(AWS);

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

    const getItemSpy = jest.fn((x) => x);
    AWSMock.mock('DynamoDB', 'getItem', (params, callback) => {
      getItemSpy(params);
      callback(null, MockProcessingConfig);
    });

    await createPipeline('testExperimentId');
    expect(describeClusterSpy).toMatchSnapshot();
    expect(createStateMachineSpy.mock.results).toMatchSnapshot();

    expect(getItemSpy).toHaveBeenCalled();

    expect(startExecutionSpy).toHaveBeenCalled();
    expect(startExecutionSpy.mock.results).toMatchSnapshot();
  });

  it('Parses processingConfig correctly', async () => {
    AWSMock.setSDKInstance(AWS);

    AWSMock.mock('EKS', 'describeCluster', (params, callback) => {
      callback(null, mockCluster);
    });

    const createStateMachineSpy = jest.fn((stateMachineObject) => JSON.parse(stateMachineObject.definition));
    AWSMock.mock('StepFunctions', 'createStateMachine', (params, callback) => {
      createStateMachineSpy(params);
      callback(null, { stateMachineArn: 'test-machine' });
    });

    AWSMock.mock('StepFunctions', 'startExecution', (params, callback) => {
      callback(null, { executionArn: 'test-machine' });
    });

    const getItemSpy = jest.fn((x) => x);
    AWSMock.mock('DynamoDB', 'getItem', (params, callback) => {
      getItemSpy(params);
      callback(null, MockProcessingConfig);
    });

    await createPipeline('testExperimentId');
    expect(createStateMachineSpy.mock.results).toMatchSnapshot();
  });

  it('Pipeline is updated instead of created if an error is thrown.', async () => {
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
