const config = require('../../../src/config');
const createPipeline = require('../../../src/api/general-services/pipeline-manage');

jest.mock('uuid', () => ({
  v4: () => 'mock-uuid',
}));

const snapshotPlainJsonSerializer = {
  // eslint-disable-next-line no-unused-vars
  test(val) {
    return true;
  },
  // eslint-disable-next-line no-unused-vars
  serialize(val, prettyConfig, indentation, depth, refs, printer) {
    return `\n${JSON.stringify(val, null, 2)}`;
  },
};
expect.addSnapshotSerializer(snapshotPlainJsonSerializer);


describe('non-tests to document the State Machines', () => {
  const context = {
    experimentId: 'mock-experiment-id',
    accountId: 'mock-account-id',
    roleArn: 'mock-role-arn',
    pipelineArtifacts: {
      images: {
        'remoter-server': 'mock-remoter-server-image',
        'remoter-client': 'mock-remoter-client-image',
      },
    },
    clusterInfo: {
      name: 'mock-cluster-name',
      endpoint: 'mock-endpoint',
      certAuthority: 'mock-ca',
    },
    processingConfig: {},
  };

  it('- local development', () => {
    config.clusterEnv = 'development';
    const stateMachine = createPipeline.buildStateMachineDefinition(context);
    config.clusterEnv = 'test';
    expect(stateMachine).toMatchSnapshot();
  });
  it('-cloud', () => {
    const stateMachine = createPipeline.buildStateMachineDefinition(context);
    expect(stateMachine).toMatchSnapshot();
  });
});
