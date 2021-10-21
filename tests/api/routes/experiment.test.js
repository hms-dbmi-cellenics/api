const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

jest.mock('../../../src/api/route-services/experiment');
jest.mock('../../../src/utils/authMiddlewares');

describe('tests for experiment route', () => {
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

  it('Find experiment by id works', async (done) => {
    request(app)
      .get('/v1/experiments/someId')
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        expect(res.body.experimentId).toBe('someId');
        expect(res.body).toMatchSnapshot();
        return done();
      });
  });

  it('Find cell sets by experiment id works', async (done) => {
    request(app)
      .get('/v1/experiments/someId/cellSets')
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        // there is no point testing for the values of the response body
        // - if something is wrong, the schema validator will catch it
        return done();
      });
  });

  it('Updating cell sets with no data results in an 415 error', async (done) => {
    request(app)
      .put('/v1/experiments/someId/cellSets')
      .expect(415)
      .end((err) => {
        if (err) {
          return done(err);
        }
        // there is no point testing for the values of the response body
        // - if something is wrong, the schema validator will catch it
        return done();
      });
  });

  it('Updating cell sets with a valid data set results in a successful response', async (done) => {
    const newData = [
      {
        name: 'Empty cluster',
        key: 'empty',
        color: '#ff00ff',
        children: [],
        cellIds: [],
      },
    ];

    request(app)
      .put('/v1/experiments/someId/cellSets')
      .send(newData)
      .expect(200, newData)
      .end((err) => {
        if (err) {
          return done(err);
        }
        // there is no point testing for the values of the response body
        // - if something is wrong, the schema validator will catch it
        return done();
      });
  });

  it('Get processing config by id works', async (done) => {
    request(app)
      .get('/v1/experiments/someId/processingConfig')
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        // there is no point testing for the values of the response body
        // - if something is wrong, the schema validator will catch it
        return done();
      });
  });

  it('Updating processing config with no data results in an 415 error', async (done) => {
    request(app)
      .put('/v1/experiments/someId/processingConfig')
      .expect(415)
      .end((err) => {
        if (err) {
          return done(err);
        }
        // there is no point testing for the values of the response body
        // - if something is wrong, the schema validator will catch it
        return done();
      });
  });

  it('Updating processing config with a valid data set results in a successful response', async (done) => {
    const newData = [
      {
        name: 'classifier',
        body: {
          enabled: true,
          prefiltered: false,
          filterSettings: {
            FDR: 0.05,
          },
        },
      },
      {
        name: 'cellSizeDistribution',
        body: {
          enabled: false,
          filterSettings: {
            minCellSize: 10800,
            binStep: 200,
          },
        },
      },
    ];

    request(app)
      .put('/v1/experiments/someId/processingConfig')
      .send(newData)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        // there is no point testing for the values of the response body
        // - if something is wrong, the schema validator will catch it
        return done();
      });
  });

  it('Downloading data with the correct download type works', async (done) => {
    request(app)
      .get('/v1/experiments/someId/download/correct_type')
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        // there is no point testing for the values of the response body
        // - if something is wrong, the schema validator will catch it
        return done();
      });
  });

  it('Downloading data with incorrect download type throws error', async (done) => {
    request(app)
      .get('/v1/experiments/someId/download/wrong_type')
      .expect(400)
      .end((err) => {
        if (err) {
          return done(err);
        }
        // there is no point testing for the values of the response body
        // - if something is wrong, the schema validator will catch it
        return done();
      });
  });
});
