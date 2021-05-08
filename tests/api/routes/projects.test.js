const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

jest.mock('../../../src/api/route-services/projects');

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


  it('Updating project send error 400 if body is invalid', async (done) => {
    const invalidPayload = {
      invalid: 'payload',
    };

    request(app)
      .put('/v1/projects/someId')
      .expect(400)
      .send(invalidPayload)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Updating project works', async (done) => {
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
          console.log(err);
          return done(err);
        }
        // there is no point testing for the values of the response body
        // - if something is wrong, the schema validator will catch it
        return done();
      });
  });
});
