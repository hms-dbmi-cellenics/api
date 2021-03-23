const AWSMock = require('aws-sdk-mock');
const _ = require('lodash');
const AWS = require('../../../src/utils/requireAWS');

const createPipeline = require('../../../src/api/general-services/pipeline-manage');

jest.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}));

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
              { S: 'sample-KO' },
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
      })),
    );

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

    const startExecutionSpy = jest.fn((x) => x);
    AWSMock.mock('StepFunctions', 'startExecution', (params, callback) => {
      startExecutionSpy(params);
      callback(null, { executionArn: 'test-execution' });
    });

    await createPipeline('testExperimentId', processingConfigUpdate);
    expect(describeClusterSpy).toMatchSnapshot();
    expect(createStateMachineSpy.mock.results).toMatchSnapshot();

    expect(updateStateMachineSpy).toHaveBeenCalled();
    expect(updateStateMachineSpy.mock.results).toMatchSnapshot();

    expect(startExecutionSpy).toHaveBeenCalled();
    expect(startExecutionSpy.mock.results).toMatchSnapshot();
  });
});
