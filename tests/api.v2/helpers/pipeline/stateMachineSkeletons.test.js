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

const getContext = (processName, environment) => ({
  experimentId: 'mock-experiment-id',
  accountId: 'mock-account-id',
  roleArn: 'mock-role-arn',
  processName,
  environment,
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
  it('- qc local development', () => {
    const env = 'development';
    const context = getContext('qc', env);
    const qcPipelineSkeleton = getQcPipelineSkeleton(env, qcStepNames);
    const stateMachine = buildStateMachineDefinition(qcPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  it('- qc staging', () => {
    const env = 'staging';
    const context = getContext('qc', env);
    const qcPipelineSkeleton = getQcPipelineSkeleton(env, qcStepNames);
    const stateMachine = buildStateMachineDefinition(qcPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  it('- qc staging with specific CPUs', () => {
    const env = 'staging';
    const context = getContext('qc', env);
    context.podCpus = 16;
    context.podMemory = undefined;
    const qcPipelineSkeleton = getQcPipelineSkeleton(env, qcStepNames, context.podCpus, context.podMemory);
    const stateMachine = buildStateMachineDefinition(qcPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  it('- qc staging with specific Mem', () => {
    const env = 'staging';
    const context = getContext('qc', env);
    context.podCpus = undefined;
    context.podMemory = 2048;
    const qcPipelineSkeleton = getQcPipelineSkeleton(env, qcStepNames, context.podCpus, context.podMemory);
    const stateMachine = buildStateMachineDefinition(qcPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  it('- qc production with specific CPUs & Mem', () => {
    const env = 'production';
    const context = getContext('qc', env);
    context.podCpus = 16;
    context.podMemory = 2048;
    const qcPipelineSkeleton = getQcPipelineSkeleton(env, qcStepNames, context.podCpus, context.podMemory);
    const stateMachine = buildStateMachineDefinition(qcPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  it('- qc production', () => {
    const env = 'production';
    const context = getContext('qc', env);
    const qcPipelineSkeleton = getQcPipelineSkeleton(env, qcStepNames);
    const stateMachine = buildStateMachineDefinition(qcPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  it('- gem2s local development', () => {
    const env = 'development';
    const context = getContext('gem2s', env);
    const gem2sPipelineSkeleton = getGem2sPipelineSkeleton(env);
    const stateMachine = buildStateMachineDefinition(gem2sPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  it('- gem2s staging', () => {
    const env = 'staging';
    const context = getContext('gem2s', env);
    const gem2sPipelineSkeleton = getGem2sPipelineSkeleton(env);
    const stateMachine = buildStateMachineDefinition(gem2sPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });

  it('- gem2s production', () => {
    const env = 'production';
    const context = getContext('gem2s', env);
    const gem2sPipelineSkeleton = getGem2sPipelineSkeleton(env);
    const stateMachine = buildStateMachineDefinition(gem2sPipelineSkeleton, context);
    expect(stateMachine).toMatchSnapshot();
  });
});
