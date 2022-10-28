const { buildStateMachineDefinition } = require('../../../../src/api.v2/helpers/pipeline/pipelineConstruct');
const {
  getGem2sPipelineSkeleton, getQcPipelineSkeleton, getQcPipelineStepNames,
} = require('../../../../src/api.v2/helpers/pipeline/pipelineConstruct/skeletons');

const qcStepNames = getQcPipelineStepNames();

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

const getContext = (processName) => ({
  experimentId: 'mock-experiment-id',
  accountId: 'mock-account-id',
  roleArn: 'mock-role-arn',
  processName,
  sandboxId: 'pipeline-assignation',
  activityArn: `arn:aws:states:eu-west-1:28592648592:activity:biomage-${processName}-production-39249897-cfce-402b-a617-e58fbf251713`,
  pipelineArtifacts: {
    'remoter-server': 'mock-remoter-server-image',
    'remoter-client': 'mock-remoter-client-image',
  },
  clusterInfo: {
    name: 'mock-cluster-name',
    endpoint: 'https://RANDOMSTRING.gr7.eu-west-1.eks.amazonaws.com',
    certAuthority: 'mock-ca',
  },
  processingConfig: {},
});


describe('non-tests to document the State Machines', () => {
  let context = getContext('qc');
  it('- qc local development', () => {
    const qcPipelineSkeleton = getQcPipelineSkeleton('development', qcStepNames);
    const stateMachine = buildStateMachineDefinition(qcPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  it('- qc staging', () => {
    const qcPipelineSkeleton = getQcPipelineSkeleton('staging', qcStepNames);
    const stateMachine = buildStateMachineDefinition(qcPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  it('- qc staging with specific CPUs', () => {
    const podCPUs = 16;
    const podMem = undefined;
    context.podCPUs = podCPUs;
    context.podMem = podMem;
    const qcPipelineSkeleton = getQcPipelineSkeleton('staging', qcStepNames, podCPUs, podMem);
    const stateMachine = buildStateMachineDefinition(qcPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  it('- qc staging with specific Mem', () => {
    const podCPUs = undefined;
    const podMem = 2048;
    context.podCPUs = podCPUs;
    context.podMem = podMem;
    const qcPipelineSkeleton = getQcPipelineSkeleton('staging', qcStepNames, podCPUs, podMem);
    const stateMachine = buildStateMachineDefinition(qcPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  it('- qc production with specific CPUs & Mem', () => {
    const podCPUs = 16;
    const podMem = 2048;
    context.podCPUs = podCPUs;
    context.podMem = podMem;
    const qcPipelineSkeleton = getQcPipelineSkeleton('staging', qcStepNames, podCPUs, podMem);
    const stateMachine = buildStateMachineDefinition(qcPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  it('- qc production', () => {
    const qcPipelineSkeleton = getQcPipelineSkeleton('production', qcStepNames);
    const stateMachine = buildStateMachineDefinition(qcPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  context = getContext('gem2s');
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
