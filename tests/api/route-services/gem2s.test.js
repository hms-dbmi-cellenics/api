const ExperimentService = require('../../../src/api/route-services/experiment');
const SamplesService = require('../../../src/api/route-services/samples');
const ProjectsService = require('../../../src/api/route-services/projects');

const Gem2sService = require('../../../src/api/route-services/gem2s');

const { OK } = require('../../../src/utils/responses');


const newGem2sHandle = {
  stateMachineArn: 'arnSM_gem2s',
  executionArn: 'arnE_sem2s',
  paramsHash: 'randomHash',
};

jest.mock('../../../src/api/route-services/experiment');
jest.mock('../../../src/api/route-services/samples');
jest.mock('../../../src/api/route-services/projects');
jest.mock('../../../src/api/general-services/pipeline-status');

const mockGem2sParamsBackendCall = (
  customProjectResponse = {},
  customSamplesResponse = {},
  customMetadataResponse = {},
) => {
  const projectResponse = {
    projectId: 'project-2',
    experimentName: 'New experiment',
    meta: {
      organism: null,
      type: '10x',
    },
    sampleIds: ['sample-1', 'sample-2'],
    ...customProjectResponse,
  };

  const samplesResponse = {
    samples: {
      'sample-1': { name: 'Sample 1' },
      'sample-2': { name: 'Sample 2' },
    },
    ...customSamplesResponse,
  };

  const metadataResponse = {
    metadataKeys: [],
    ...customMetadataResponse,
  };

  ExperimentService.mockImplementation(() => ({
    getExperimentData: jest.fn()
      .mockImplementationOnce(() => Promise.resolve(projectResponse)),
    saveGem2sHandle: jest.fn(),
  }));

  SamplesService.mockImplementation(() => ({
    getSamplesByExperimentId: jest.fn()
      .mockImplementationOnce(() => Promise.resolve(samplesResponse)),
  }));

  ProjectsService.mockImplementation(() => ({
    getProject: jest.fn()
      .mockImplementationOnce(() => Promise.resolve(metadataResponse)),
  }));
};

jest.mock('../../../src/api/general-services/pipeline-manage', () => ({
  createGem2SPipeline: jest.fn(() => Promise.resolve({
    stateMachineArn: 'arnSM_gem2s',
    executionArn: 'arnE_sem2s',
    paramsHash: 'randomHash',
  })),
}));

const experimentId = '1234';

describe('gem2sCreate', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('GEM2S should run when passed shouldRun is true', async () => {
    mockGem2sParamsBackendCall();

    const requestBody = {
      gem2sHash: 'gem2sHash1234',
      shouldRun: true,
    };

    const newHandle = await Gem2sService.gem2sCreate(experimentId, requestBody);
    expect(newHandle).toEqual(newGem2sHandle);
  });

  it('GEM2S should not run when passed shouldRun is false', async () => {
    const requestBody = {
      gem2sHash: 'gem2sHash1234',
      shouldRun: false,
    };

    const response = await Gem2sService.gem2sCreate(experimentId, requestBody);

    expect(response).toEqual(OK());
  });

  it('Should generate GEM2S taskParams correctly', async () => {
    mockGem2sParamsBackendCall();

    const mockAuthJwt = 'mockAuthJwt';
    const taskParams = await Gem2sService.generateGem2sParams(experimentId, mockAuthJwt);

    expect(taskParams).toMatchSnapshot();
  });
});
