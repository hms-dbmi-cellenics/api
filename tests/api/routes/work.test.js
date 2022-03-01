const request = require('supertest');
const express = require('express');
const expressLoader = require('../../../src/loaders/express');

jest.mock('../../../src/utils/authMiddlewares');
jest.mock('../../../src/api/services/get-work-results');

describe('work routes tests', () => {
  let app = null;

  beforeEach(async () => {
    const mockApp = await expressLoader(express());
    app = mockApp.app;
  });

  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('Get work signed url returns 200', async (done) => {
    request(app)
      .get('/v1/workResults/someId/someETag')
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Getting work results for an experiment without permissions returns 403', async (done) => {
    request(app)
      .get('/v1/workResults/unauthorizedExperimentId/someETag')
      .expect(403)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });
  it('If no tags are found returns 404', async (done) => {
    request(app)
      .get('/v1/workResults/nonExistentId/someETag')
      .expect(404)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });
});
