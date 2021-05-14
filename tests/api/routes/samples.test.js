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
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('Get samples by experimentId returns 200', async (done) => {
    request(app)
      .get('/v1/experiments/someId/samples')
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Requesting sample for a non-existing experimentId returns 404', async (done) => {
    request(app)
      .get('/v1/experiments/nonExistentId/samples')
      .expect(404)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Updating correct samples return 200 ', async (done) => {
    const payload = {
      projectUuid: 'project-uuid',
      experimentId: 'experiment-id',
      samples: {
        ids: ['sample-1'],
        'sample-1': {
          name: 'sample-1',
        },
      },
    };

    request(app)
      .put('/v1/projects/someId/experimentId/samples')
      .send(payload)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Updating samples with invalid body returns error 400', async (done) => {
    const invalidPayload = {
      invalid: 'payload',
    };

    request(app)
      .put('/v1/projects/someId/experimentId/samples')
      .expect(400)
      .send(invalidPayload)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Updating samples with body without data returns error 415', async (done) => {
    request(app)
      .put('/v1/projects/someId/experimentId/samples')
      .expect(415)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });
});
