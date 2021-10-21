const _ = require('lodash');
const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

jest.mock('../../../src/api/route-services/samples');
jest.mock('../../../src/utils/authMiddlewares');

describe('tests for samples route', () => {
  const correctSample = {
    'sample-1': {
      name: 'sample-1',
      projectUuid: 'project-1',
      uuid: 'sample-1',
      type: '10X Chromium',
      species: 'hsapies',
      createdDate: '2020-01-01T00:00:00.000Z',
      lastModified: null,
      complete: true,
      error: false,
      fileNames: ['test-1'],
      files: {
        'file-1': {
          name: 'file-1',
        },
      },
    },
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

  it('Updating correct samples return 200 ', async (done) => {
    request(app)
      .put('/v1/projects/projectId/experimentId/samples')
      .send({ samples: correctSample })
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Updating with invalid sample body returns error 400', async (done) => {
    const invalidBodySample = _.cloneDeep(correctSample);

    delete invalidBodySample['sample-1'].species;

    request(app)
      .put('/v1/projects/someId/experimentId/samples')
      .expect(400)
      .send({ samples: invalidBodySample })
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Updating with extra properties returns error 400', async (done) => {
    const extraPropertiesBodySample = _.cloneDeep(correctSample);

    extraPropertiesBodySample['sample-1'].invalid = 'invalid';

    request(app)
      .put('/v1/projects/someId/experimentId/samples')
      .expect(400)
      .send({ samples: extraPropertiesBodySample })
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Creating correct shape samples return 200 ', async (done) => {
    request(app)
      .post('/v1/projects/projectId/experimentId/samples')
      .send({ samples: correctSample })
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Creating with invalid sample body returns error 400', async (done) => {
    const invalidBodySample = _.cloneDeep(correctSample);

    delete invalidBodySample['sample-1'].species;

    request(app)
      .post('/v1/projects/someId/experimentId/samples')
      .expect(400)
      .send({ samples: invalidBodySample })
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Creating with extra properties returns error 400', async (done) => {
    const extraPropertiesBodySample = _.cloneDeep(correctSample);

    extraPropertiesBodySample['sample-1'].invalid = 'invalid';

    request(app)
      .post('/v1/projects/someId/experimentId/samples')
      .expect(400)
      .send({ samples: extraPropertiesBodySample })
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

  test('Adding a sample with correctly shaped project returns 200', async (done) => {
    const payload = {
      projectUuid: 'project-uuid',
      experimentId: 'experiment-id',
      uuid: 'sampleUuid',
      name: 'sample-1',
    };

    request(app)
      .post('/v1/projects/someId/experimentId/samples')
      .send(payload)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  test('Adding a sample with invalid shape returns 400', async (done) => {
    const payload = {
      invalid: 'invalid',
    };

    request(app)
      .post('/v1/projects/someId/experimentId/samples')
      .send(payload)
      .expect(400)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });
});
