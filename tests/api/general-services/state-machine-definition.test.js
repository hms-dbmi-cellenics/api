const config = require('../../../src/config');
const { buildStateMachineDefinition } = require('../../../src/api/general-services/pipeline-manage');
const { qcPipelineSkeleton } = require('../../../src/api/general-services/pipeline-manage/skeletons/qc-pipeline-skeleton');
const { gem2sPipelineSkeleton } = require('../../../src/api/general-services/pipeline-manage/skeletons/gem2s-pipeline-skeleton');

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: () => Buffer.from('asdfg'),
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
      'remoter-server': 'mock-remoter-server-image',
      'remoter-client': 'mock-remoter-client-image',
    },
    clusterInfo: {
      name: 'mock-cluster-name',
      endpoint: 'mock-endpoint',
      certAuthority: 'mock-ca',
    },
    processingConfig: {},
  };

  it('- qc local development', () => {
    config.clusterEnv = 'development';
    const stateMachine = buildStateMachineDefinition(qcPipelineSkeleton, context);
    config.clusterEnv = 'test';
    expect(stateMachine).toMatchSnapshot();
  });

  it('- qc cloud', () => {
    const stateMachine = buildStateMachineDefinition(qcPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  it('- gem2s local development', () => {
    config.clusterEnv = 'development';
    const stateMachine = buildStateMachineDefinition(gem2sPipelineSkeleton, context);
    config.clusterEnv = 'test';
    expect(stateMachine).toMatchSnapshot();
  });
  it('- gem2s cloud', () => {
    const stateMachine = buildStateMachineDefinition(gem2sPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });
});
