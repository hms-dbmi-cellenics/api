const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

jest.mock('../../../src/api/services/getBackendStatus');

describe('tests for samples route', () => {
  let app = null;

  beforeEach(async () => {
    const mockApp = await expressLoader(express());
    app = mockApp.app;
  });

  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('Get backend returns 200', async (done) => {
    request(app)
      .get('/v1/experiments/someId/backendStatus')
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Get backend status with non-existing experimentId returns 404', async (done) => {
    request(app)
      .get('/v1/experiments/nonExistentId/backendStatus')
      .expect(404)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });
});
