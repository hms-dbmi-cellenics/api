const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

jest.mock('../../../src/api/route-services/projects');
jest.mock('../../../src/utils/authMiddlewares');

describe('tests for projects route', () => {
  let app = null;

  beforeEach(async () => {
    const mockApp = await expressLoader(express());
    app = mockApp.app;
  });

  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('Getting list of projects via /projects return 200', async (done) => {
    request(app)
      .get('/v1/projects')
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Getting project experiments send 200', async (done) => {
    request(app)
      .get('/v1/projects/someId/experiments')
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Getting project experiments send 404 if id is not found', async (done) => {
    request(app)
      .get('/v1/projects/unknown-project/experiments')
      .expect(404)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Updating project send 200', async (done) => {
    const payload = {
      name: 'Test project',
      description: '',
      createdDate: '',
      lastModified: '',
      uuid: 'project-1',
      experiments: [],
      lastAnalyzed: null,
      samples: [],
    };

    request(app)
      .put('/v1/projects/someId')
      .send(payload)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Updating project send error 400 if body is invalid', async (done) => {
    const invalidPayload = {
      invalid: 'payload',
    };

    request(app)
      .put('/v1/projects/someId')
      .send(invalidPayload)
      .expect(400)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Updating project with unknown project sends error 404', async (done) => {
    const payload = {
      name: 'Test project',
      description: '',
      createdDate: '',
      lastModified: '',
      uuid: 'project-1',
      experiments: [],
      lastAnalyzed: null,
      samples: [],
    };

    request(app)
      .put('/v1/projects/unknown-project')
      .send(payload)
      .expect(404)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Updating project send error 415 if body does not contain data', async (done) => {
    request(app)
      .put('/v1/projects/someId')
      .expect(415)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Deleting project send 200', async (done) => {
    request(app)
      .delete('/v1/projects/someId')
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Deleting project with unknown project sends error 404', async (done) => {
    request(app)
      .delete('/v1/projects/unknown-project')
      .expect(404)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });
});
