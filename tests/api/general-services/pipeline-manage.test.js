const AWSMock = require('aws-sdk-mock');
const _ = require('lodash');
const AWS = require('../../../src/utils/requireAWS');

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: () => Buffer.from('asdfg'),
}));
jest.mock('../../../src/utils/asyncTimer');

const { createPipeline } = jest.requireActual('../../../src/api/general-services/pipeline-manage');

describe('test for pipeline services', () => {
  afterEach(() => {
    AWSMock.restore('EKS');
    AWSMock.restore('StepFunctions');
  });


  const MockProcessingConfig = {
    Item: {
      processingConfig: {
        M: {
          doubletScores: {
            M: {
              enabled: {
                BOOL: true,
              },
              filterSettings: {
                M: {
                  oneSetting: {
                    N: 1,
                  },
                },
              },
              oneSample: {
                M: {
                  filterSettings: {
                    M: {
                      oneSetting: {
                        N: 1,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  const MockSamples = {
    Item: {
      samples: {
        M: {
          ids: {
            L: [
              { S: 'oneSample' },
              { S: 'otherSample' },
            ],
          },
        },
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

  const processingConfigUpdate = [
    {
      name: 'doubletScores',
      body: {
        oneSample: {
          filterSettings: {
            oneSetting: 7,
          },
        },
        otherSample: {
          filterSettings: {
            oneSetting: 15,
          },
        },
      },
    },
  ];

  it('Create pipeline works', async () => {
    AWSMock.setSDKInstance(AWS);

    const describeClusterSpy = jest.fn((x) => x);
    AWSMock.mock('EKS', 'describeCluster', (params, callback) => {
      describeClusterSpy(params);
      callback(null, mockCluster);
    });

    const createStateMachineSpy = jest.fn(
      (stateMachineObject) => _.omit(stateMachineObject, ['definition', 'image']),
    );

    AWSMock.mock('StepFunctions', 'createStateMachine', (params, callback) => {
      createStateMachineSpy(params);
      callback(null, { stateMachineArn: 'test-machine' });
    });

    const createActivitySpy = jest.fn((x) => x);
    AWSMock.mock('StepFunctions', 'createActivity', (params, callback) => {
      createActivitySpy(params);
      callback(null, { activityArn: 'test-actvitiy' });
    });

    const startExecutionSpy = jest.fn((x) => x);
    AWSMock.mock('StepFunctions', 'startExecution', (params, callback) => {
      startExecutionSpy(params);
      callback(null, { executionArn: 'test-machine' });
    });

    const getProcessingConfigSpy = jest.fn((x) => x);
    const getSamplesSpy = jest.fn((x) => x);
    AWSMock.mock('DynamoDB', 'getItem', (params, callback) => {
      if (params.TableName.match('experiments')) {
        getProcessingConfigSpy(params);
        callback(null, MockProcessingConfig);
      } else if (params.TableName.match('samples')) {
        getSamplesSpy(params);
        callback(null, MockSamples);
      }
    });

    await createPipeline('testExperimentId', processingConfigUpdate);
    expect(describeClusterSpy).toMatchSnapshot();

    expect(createStateMachineSpy.mock.results).toMatchSnapshot();

    expect(getProcessingConfigSpy).toHaveBeenCalled();
    expect(getSamplesSpy).toHaveBeenCalled();

    expect(createActivitySpy).toHaveBeenCalled();
    expect(startExecutionSpy).toHaveBeenCalled();
    expect(startExecutionSpy.mock.results).toMatchSnapshot();
  });

  it('Parses processingConfig correctly', async () => {
    AWSMock.setSDKInstance(AWS);

    AWSMock.mock('EKS', 'describeCluster', (params, callback) => {
      callback(null, mockCluster);
    });

    const createStateMachineSpy = jest.fn(
      // eslint-disable-next-line consistent-return
      (stateMachineObject) => (_.cloneDeepWith(JSON.parse(stateMachineObject.definition), (o) => {
        if (_.isObject(o) && o.image) {
          return {
            ...o,
            image: 'MOCK_IMAGE_PATH',
          };
        }

        if (_.isObject(o) && o.ref) {
          return {
            ...o,
            ref: 'MOCK_REF_PATH',
          };
        }
      })),
    );

    AWSMock.mock('StepFunctions', 'createStateMachine', (params, callback) => {
      createStateMachineSpy(params);
      callback(null, { stateMachineArn: 'test-machine' });
    });

    const createActivitySpy = jest.fn((x) => x);
    AWSMock.mock('StepFunctions', 'createActivity', (params, callback) => {
      createActivitySpy(params);
      callback(null, { activityArn: 'test-actvitiy' });
    });

    AWSMock.mock('StepFunctions', 'startExecution', (params, callback) => {
      callback(null, { executionArn: 'test-machine' });
    });

    const getProcessingConfigSpy = jest.fn((x) => x);
    const getSamplesSpy = jest.fn((x) => x);
    AWSMock.mock('DynamoDB', 'getItem', (params, callback) => {
      if (params.TableName.match('experiments')) {
        getProcessingConfigSpy(params);
        callback(null, _.cloneDeep(MockProcessingConfig));
      } else if (params.TableName.match('samples')) {
        getSamplesSpy(params);
        callback(null, _.cloneDeep(MockSamples));
      }
    });

    await createPipeline('testExperimentId', processingConfigUpdate);
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

    const createActivitySpy = jest.fn((x) => x);
    AWSMock.mock('StepFunctions', 'createActivity', (params, callback) => {
      createActivitySpy(params);
      callback(null, { activityArn: 'test-actvitiy' });
    });

    const startExecutionSpy = jest.fn((x) => x);
    AWSMock.mock('StepFunctions', 'startExecution', (params, callback) => {
      startExecutionSpy(params);
      callback(null, { executionArn: 'test-execution' });
    });

    createPipeline.waitForDefinitionToPropagate = () => true;

    await createPipeline('testExperimentId', processingConfigUpdate);

    expect(describeClusterSpy).toMatchSnapshot();
    expect(createStateMachineSpy.mock.results).toMatchSnapshot();

    expect(updateStateMachineSpy).toHaveBeenCalled();
    expect(updateStateMachineSpy.mock.results).toMatchSnapshot();

    expect(createActivitySpy).toHaveBeenCalled();
    expect(startExecutionSpy).toHaveBeenCalled();
    expect(startExecutionSpy.mock.results).toMatchSnapshot();
  });
});
