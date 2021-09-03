const { buildStateMachineDefinition } = require('../../../src/api/general-services/pipeline-manage');
const { getQcPipelineSkeleton } = require('../../../src/api/general-services/pipeline-manage/skeletons/qc-pipeline-skeleton');
const { getGem2sPipelineSkeleton } = require('../../../src/api/general-services/pipeline-manage/skeletons/gem2s-pipeline-skeleton');

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
    const qcPipelineSkeleton = getQcPipelineSkeleton('development');
    const stateMachine = buildStateMachineDefinition(qcPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  it('- qc staging', () => {
    const qcPipelineSkeleton = getQcPipelineSkeleton('staging');
    const stateMachine = buildStateMachineDefinition(qcPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  it('- qc production', () => {
    const qcPipelineSkeleton = getQcPipelineSkeleton('production');
    const stateMachine = buildStateMachineDefinition(qcPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  it('- gem2s local development', () => {
    const gem2sPipelineSkeleton = getGem2sPipelineSkeleton('development');
    const stateMachine = buildStateMachineDefinition(gem2sPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  it('- gem2s staging', () => {
    const gem2sPipelineSkeleton = getGem2sPipelineSkeleton('staging');
    const stateMachine = buildStateMachineDefinition(gem2sPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  it('- gem2s production', () => {
    const gem2sPipelineSkeleton = getGem2sPipelineSkeleton('production');
    const stateMachine = buildStateMachineDefinition(gem2sPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });
});
