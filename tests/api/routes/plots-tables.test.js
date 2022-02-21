const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');
const fake = require('../../test-utils/constants');

jest.mock('../../../src/utils/authMiddlewares');


const mockExperimentId = fake.EXPERIMENT_ID;
const mockPlotUuid = fake.PLOT_UUID;

jest.mock('../../../src/api/route-services/plots-tables');

describe('Plots and tables routes', () => {
  let app = null;

  beforeEach(async () => {
    const mockApp = await expressLoader(express());
    app = mockApp.app;
  });

  afterEach(() => {
    /**
     * Most important since b'coz of caching, the mocked implementations sometimes does not reset
     */
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('Endpoint to get plot details exists', async (done) => {
    request(app)
      .get(`/v1/experiments/${mockExperimentId}/plots-tables/${mockPlotUuid}`)
      .expect(200, done);
  });

  it('Throws an error if the experimentId or plotId is not found', async (done) => {
    request(app)
      .get(`/v1/experiments/${mockExperimentId}/plots-tables/nonExistentPlotUuid`)
      .expect(404, done);
  });

  it('Endpoint to update plot details exists', async (done) => {
    const mockPlotConfig = {
      experimentId: mockExperimentId,
      plotUuid: mockPlotUuid,
      plotType: 'DotPlot',
      config: {},
    };

    request(app)
      .put(`/v1/experiments/${mockExperimentId}/plots-tables/${mockPlotUuid}`)
      .send(mockPlotConfig)
      .expect(200, done);
  });

  it('Endpoint to update plot details sends 415 error if not submitted with the correct schema', async (done) => {
    request(app)
      .put(`/v1/experiments/${mockExperimentId}/plots-tables/${mockPlotUuid}`)
      .expect(415, done);
  });
});
