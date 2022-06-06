// @ts-nocheck
const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

const { OK } = require('../../../src/utils/responses');

const plotController = require('../../../src/api.v2/controllers/plotController');

jest.mock('../../../src/api.v2/controllers/plotController', () => ({
  getPlotConfig: jest.fn(),
  updatePlotConfig: jest.fn(),
}));

jest.mock('../../../src/api.v2/middlewares/authMiddlewares');

let app = null;

const url = '/v2/experiments/mockSomeId/plots/mockPlotUuid';

describe('tests for plots route', () => {
  beforeEach(async () => {
    const mockApp = await expressLoader(express());
    app = mockApp.app;
  });

  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('Get plots by plotUuid returns 200', async (done) => {
    plotController.getPlotConfig.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    request(app)
      .get(url)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Updating correct plot return 200 ', async (done) => {
    plotController.updatePlotConfig.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    const validPlotConfig = {
      config: {
        legend: { enabled: false },
        title: 'Plot Title',
      },
    };

    request(app)
      .put(url)
      .send(validPlotConfig)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Updating with invalid plot body returns error 400', async (done) => {
    plotController.updatePlotConfig.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    const invalidPlotConfig = {
      notAConfig: {
        cellIds: [],
      },
    };

    request(app)
      .put(url)
      .expect(400)
      .send(invalidPlotConfig)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });
});
