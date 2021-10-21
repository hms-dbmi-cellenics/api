const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

jest.mock('../../../src/api/route-services/projects');
jest.mock('../../../src/utils/authMiddlewares');

describe('tests for projects route', () => {
  const correctProject = {
    metadataKeys: [],
    createdDate: '2021-10-20T17:03:18.893Z',
    experiments: [
      'experimentId',
    ],
    name: 'asdsadsad',
    description: '',
    lastAnalyzed: null,
    lastModified: '2021-10-20T17:03:18.893Z',
    uuid: 'projectUuid',
    samples: [
      'sampleId1',
      'sampleId2',
    ],
  };

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

  it('Creating project with correctly shaped project returns 200', async (done) => {
    request(app)
      .post('/v1/projects/someId')
      .send(correctProject)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Creating project lacking required properties returns 400', async (done) => {
    const { metadataKeys, ...restOfProject } = correctProject;

    request(app)
      .post('/v1/projects/someId')
      .send(restOfProject)
      .expect(400)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Creating project with unexpected extra properties returns 400', async (done) => {
    const invalidProject = { invalid: 'invalid', ...correctProject };

    request(app)
      .post('/v1/projects/someId')
      .send(invalidProject)
      .expect(400)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Updating project send 200', async (done) => {
    request(app)
      .put('/v1/projects/someId')
      .send(correctProject)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Updating project lacking required properties returns 400', async (done) => {
    const { metadataKeys, ...restOfProject } = correctProject;

    request(app)
      .put('/v1/projects/someId')
      .send(restOfProject)
      .expect(400)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Updating project with unexpected extra properties returns 400', async (done) => {
    const invalidProject = { invalid: 'invalid', ...correctProject };

    request(app)
      .post('/v1/projects/someId')
      .send(invalidProject)
      .expect(400)
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
});
