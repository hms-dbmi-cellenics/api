const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

jest.mock('../../../src/api/services/experiments/ExperimentService');
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

  it('Patching cell sets with no data results in an 415 error', async (done) => {
    request(app)
      .patch('/v1/experiments/someId/cellSets')
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

  it('Patching cell sets with a valid body content type results in a successful response', async (done) => {
    const createNewCellSetJsonMerger = [{
      $match: {
        query: '$[?(@.key == "scratchpad")]',
        value: {
          children: [{
            $insert: {
              index: '-',
              value: {
                key: '05e036a5-a2ae-4909-99e1-c3b927a584e3', name: 'New Cluster', color: '#3957ff', type: 'cellSets', cellIds: [438, 444, 713, 822, 192, 576, 675],
              },
            },
          }],
        },
      },
    }];

    const validContentType = 'application/boschni-json-merger+json';

    request(app)
      .patch('/v1/experiments/someId/cellSets')
      .set('Content-type', validContentType)
      .send(createNewCellSetJsonMerger)
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

  it('Patching cell sets with an invalid body content type results in a 400', async (done) => {
    const createNewCellSetJsonMerger = [{
      $match: {
        query: '$[?(@.key == "scratchpad")]',
        value: {
          children: [{
            $insert: {
              index: '-',
              value: {
                key: '05e036a5-a2ae-4909-99e1-c3b927a584e3', name: 'New Cluster', color: '#3957ff', type: 'cellSets', cellIds: [438, 444, 713, 822, 192, 576, 675],
              },
            },
          }],
        },
      },
    }];

    const invalidContentType = 'application/json';

    request(app)
      .patch('/v1/experiments/someId/cellSets')
      .set('Content-type', invalidContentType)
      .send(createNewCellSetJsonMerger)
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
