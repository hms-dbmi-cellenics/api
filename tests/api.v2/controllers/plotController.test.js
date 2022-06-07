// Disable semantic check because linter doesn't recognize jest mocks
// @ts-nocheck
const plotController = require('../../../src/api.v2/controllers/plotController');
const Plot = require('../../../src/api.v2/model/Plot');

const { OK } = require('../../../src/utils/responses');

jest.mock('../../../src/api.v2/model/Plot');

const mockRes = {
  json: jest.fn(),
  send: jest.fn(),
};

const mockExperimentId = 'experimentId';
const mockPlotUuid = 'plotUuid';

const plotInstance = new Plot();

describe('plotController', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('getting plot works correctly', async () => {
    const mockConfig = {
      experimentId: mockExperimentId,
      plotUuid: mockPlotUuid,
      plotType: 'SomePlotType',
      config: {},
    };

    plotInstance.getConfig.mockReturnValue(mockConfig);

    const mockReq = {
      params: { experimentId: mockExperimentId, plotUuid: mockPlotUuid },
    };

    await plotController.getPlotConfig(mockReq, mockRes);

    expect(plotInstance.getConfig).toHaveBeenCalledWith(
      mockExperimentId, mockPlotUuid,
    );

    expect(mockRes.json).toHaveBeenCalledWith(mockConfig);
  });

  it('updating plot works correctly', async () => {
    const mockConfig = {
      experimentId: mockExperimentId,
      plotUuid: mockPlotUuid,
      plotType: 'SomePlotType',
      config: {},
    };

    const mockReq = {
      params: { experimentId: mockExperimentId, plotUuid: mockPlotUuid },
      body: { config: mockConfig },
    };

    await plotController.updatePlotConfig(mockReq, mockRes);

    expect(plotInstance.updateConfig).toHaveBeenCalledWith(
      mockExperimentId, mockPlotUuid, mockConfig,
    );

    expect(mockRes.send).toHaveBeenCalledWith(OK());
  });
});
