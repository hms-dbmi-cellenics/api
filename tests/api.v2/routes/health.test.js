const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');
const CacheSingleton = require('../../../src/cache');

jest.mock('../../../src/cache');

jest.setTimeout(30000);

describe('tests for the healthcheck route', () => {
  it('Check health', async (done) => {
    const { app } = await expressLoader(express());
    CacheSingleton.createMock({});

    request(app)
      .get('/v2/health')
      .expect(200)
      .end((err, res) => {
        if (err) {
          return done(err);
        }
        expect(res.body.status).toBe('up');
        expect(res.body.env).toBe('test');
        expect(res.body.clusterEnv).toBe('test');
        return done();
      });
  });
});
