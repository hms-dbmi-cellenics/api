const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

jest.mock('../../../src/api/route-services/experiment');

describe('tests for experiment route', () => {
  afterEach(() => {
    /**
     * Most important since b'coz of caching, the mocked implementations sometimes does not reset
     */
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('Find experiment by id works', async (done) => {
    const { app } = await expressLoader(express());

    request(app)
      .get('/v1/experiments/someId')
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        expect(res.body.experimentId).toBe('someId');
        expect(res.body.experimentName).toBe('my mocky name');
        return done();
      });
  });

  it('Find cell sets by experiment id works', async (done) => {
    const { app } = await expressLoader(express());
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
    const { app } = await expressLoader(express());

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
    const { app } = await expressLoader(express());

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
    const { app } = await expressLoader(express());
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
    const { app } = await expressLoader(express());

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
    const { app } = await expressLoader(express());

    const newData = [
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

    const result = {
      cellSizeDistribution: {
        M: {
          filterSettings: {
            M: {
              minCellSize: {
                N: '10800',
              },
              binStep: {
                N: '200',
              },
            },
          },
          enabled: {
            BOOL: false,
          },
        },
      },
    };

    request(app)
      .put('/v1/experiments/someId/processingConfig')
      .send(newData)
      .expect(200, result)
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
