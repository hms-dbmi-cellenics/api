/* eslint-disable arrow-body-style */
/* eslint-disable global-require */
const ExperimentService = require('../../../src/api/route-services/experiment');
const Gem2sService = require('../../../src/api/route-services/gem2s');
const SamplesService = require('../../../src/api/route-services/samples');
const ProjectsService = require('../../../src/api/route-services/projects');
const { createGem2SPipeline } = require('../../../src/api/general-services/pipeline-manage');

jest.mock('../../../src/api/route-services/experiment');
jest.mock('../../../src/api/route-services/samples');
jest.mock('../../../src/api/route-services/projects');
jest.mock('../../../src/api/general-services/pipeline-status');
jest.mock('../../../src/api/general-services/pipeline-manage');
jest.mock('../../../src/utils/authMiddlewares');

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

  const mockSaveGem2sHandle = jest.fn();
  ExperimentService.mockImplementation(() => ({
    getExperimentData: jest.fn()
      .mockImplementationOnce(() => Promise.resolve(projectResponse)),
    saveGem2sHandle: mockSaveGem2sHandle,
  }));


  SamplesService.mockImplementation(() => ({
    getSamplesByExperimentId: jest.fn()
      .mockImplementationOnce(() => Promise.resolve(samplesResponse)),
  }));

  ProjectsService.mockImplementation(() => ({
    getProject: jest.fn()
      .mockImplementationOnce(() => Promise.resolve(metadataResponse)),
  }));

  return {
    mockSaveGem2sHandle,
  };
};

const experimentId = 'abcd1234';
const mockAuthJwt = 'mockAuthJwtToken';

describe('gem2s', () => {
  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('gem2sCreate - Creates new GEM2S handles and save them to database', async () => {
    const { mockSaveGem2sHandle } = mockGem2sParamsBackendCall();

    const mockBody = {
      paramsHash: 'gem2s-params-hash',
    };

    await Gem2sService.gem2sCreate(experimentId, mockBody, mockAuthJwt);

    // Create new handles
    expect(createGem2SPipeline).toHaveBeenCalled();

    // // Create new handles
    expect(mockSaveGem2sHandle).toHaveBeenCalled();
  });

  it('generateGem2sParams - Should generate GEM2S taskParams correctly', async () => {
    mockGem2sParamsBackendCall();

    const taskParams = await Gem2sService.generateGem2sParams(experimentId, mockAuthJwt);

    expect(taskParams).toMatchSnapshot();
  });

  it('sendUpdateToSubscribed - Should send update if payloads are correct', async () => {
    const mockedSocketsEmit = jest.fn();
    const mockIo = {
      sockets: {
        emit: mockedSocketsEmit,
      },
    };

    const parsedMessage = {
      taskName: 'downloadGem',
      experimentId: 'experimentId',
      authJWT: 'Bearer mockAuthJwtToken',
    };

    await Gem2sService.sendUpdateToSubscribed(experimentId, parsedMessage, mockIo);

    const emitParamsChannel = mockedSocketsEmit.mock.calls[0][0];
    expect(mockedSocketsEmit).toHaveBeenCalled();

    // Emitted to the correct channel
    expect(emitParamsChannel).toMatch(experimentId);
    expect(mockedSocketsEmit).toMatchSnapshot();
  });

  it('gem2sResponse - Should return message if message is valid', async () => {
    const mockedSocketsEmit = jest.fn();
    const mockIo = {
      sockets: {
        emit: mockedSocketsEmit,
      },
    };

    const validMessage = {
      taskName: 'downloadGem',
      experimentId,
      input: {
        authJWT: 'samplejwt',
        processName: 'gem2s',
      },
    };

    await Gem2sService.gem2sResponse(mockIo, validMessage);

    const emitParamsChannel = mockedSocketsEmit.mock.calls[0][0];
    expect(mockedSocketsEmit).toHaveBeenCalled();

    // Emitted to the correct channel
    expect(emitParamsChannel).toMatch(experimentId);
    expect(mockedSocketsEmit).toMatchSnapshot();
  });

  it('gem2sResponse - Should throw an error if message is invalid', async () => {
    const mockedSocketsEmit = jest.fn();
    const mockIo = {
      sockets: {
        emit: mockedSocketsEmit,
      },
    };

    const InvalidMessage = {
      taskName: 'downloadGem',

    };

    await expect(Gem2sService.gem2sResponse(mockIo, InvalidMessage)).rejects.toBeInstanceOf(Error);

    expect(mockedSocketsEmit).not.toHaveBeenCalled();
  });

  it('gem2sReponse - Pass on error message properly', async () => {
    const mockedSocketsEmit = jest.fn();
    const mockIo = {
      sockets: {
        emit: mockedSocketsEmit,
      },
    };

    const errorText = 'some unknwon error';

    const errorMessage = {
      experimentId,
      response: {
        error: errorText,
      },
      input: {
        authJWT: 'Bearer ayyylmaoxd',
        processName: 'gem2s',
      },
    };

    await Gem2sService.gem2sResponse(mockIo, errorMessage);

    const emitParamsChannel = mockedSocketsEmit.mock.calls[0][0];
    const errorMessge = mockedSocketsEmit.mock.calls[0][1].response.error;

    expect(mockedSocketsEmit).toHaveBeenCalled();

    // Emitted to the correct channel
    expect(emitParamsChannel).toMatch(experimentId);
    expect(errorMessge).toEqual(errorText);

    expect(mockedSocketsEmit).toMatchSnapshot();
  });
});
