const { OK } = require('../../../utils/responses');

const mockGetPlot = jest.fn((experimentId, plotUuid) => {
  if (plotUuid === 'nonExistentPlotUuid') {
    return Promise.reject(new Error('Plot not found'));
  }

  return Promise.resolve(OK());
});

const mockCreatePlot = jest.fn().mockReturnValue(
  Promise.resolve({ config: {} }),
);

const mock = jest.fn().mockImplementation(() => ({
  read: mockGetPlot,
  create: mockCreatePlot,
}));

module.exports = mock;
