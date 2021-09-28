/* eslint-disable arrow-body-style */
/* eslint-disable global-require */
const ExperimentService = require('../../../src/api/route-services/experiment');
const Gem2sService = require('../../../src/api/route-services/gem2s');
const SamplesService = require('../../../src/api/route-services/samples');
const ProjectsService = require('../../../src/api/route-services/projects');

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
const mockAuthJwt = 'mockAuthJwt';

describe('gem2s', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('gem2sCreate - Creates new GEM2S handles and save them to database', async () => {
    const mockBody = {
      paramsHash: 'gem2s-params-hash',
    };

    const { createGem2SPipeline } = require('../../../src/api/general-services/pipeline-manage');

    jest.mock('../../../src/api/route-services/gem2s', () => {
      const OriginalClass = jest.requireActual('../../../src/api/route-services/gem2s');
      OriginalClass.prototype.generateGem2sParams = jest.fn(() => ({}));
      const originalClass = new OriginalClass();

      return function () {
        return originalClass;
      };
    });

    const mockSaveGem2sHandle = jest.fn();

    jest.mock('../../../src/api/route-services/experiment', () => {
      return jest.fn().mockImplementation(() => {
        return { saveGem2sHandle: mockSaveGem2sHandle };
      });
    });

    const MockedGem2sService = require('../../../src/api/route-services/gem2s');

    const gem2sService = new MockedGem2sService();

    await gem2sService.gem2sCreate(experimentId, mockBody, mockAuthJwt);

    // Create new gem2sParamsHash
    expect(gem2sService.generateGem2sParams).toHaveBeenCalled();

    // Create new handles
    expect(createGem2SPipeline).toHaveBeenCalled();

    console.log('*** Mocked service', mockSaveGem2sHandle);

    // // Create new handles
    expect(mockSaveGem2sHandle).toHaveBeenCalled();
  });

  it('generateGem2sParams - Should generate GEM2S taskParams correctly', async () => {
    mockGem2sParamsBackendCall();

    const taskParams = await Gem2sService.generateGem2sParams(experimentId, mockAuthJwt);

    expect(taskParams).toMatchSnapshot();
  });
});
