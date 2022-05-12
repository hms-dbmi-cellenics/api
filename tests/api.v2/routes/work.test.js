const request = require('supertest');
const express = require('express');
const expressLoader = require('../../../src/loaders/express');

jest.mock('../../../src/api.v2/middlewares/authMiddlewares');
jest.mock('../../../src/api.v2/helpers/worker/getWorkResults');

describe('work routes tests', () => {
  let app = null;

  beforeEach(async () => {
    const mockApp = await expressLoader(express());
    app = mockApp.app;
  });

  it('Get work signed url returns 200', async (done) => {
    request(app)
      .get('/v2/workResults/someId/someETag')
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
      .get('/v2/workResults/unauthorizedExperimentId/someETag')
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
      .get('/v2/workResults/nonExistentId/someETag')
      .expect(404)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });
});
