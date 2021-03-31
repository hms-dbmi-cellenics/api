const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

jest.mock('../../../src/api/route-services/samples');

describe('tests for samples route', () => {
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

  it('Get samples by experimentId works', async (done) => {
    request(app)
      .get('/v1/experiments/someId/samples')
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        expect(res.body).toEqual({
          samples: {
            ids: ['sample-1'],
            'sample-1': {
              name: 'sample-1',
            },
          },
        });
        return done();
      });
  });
});
