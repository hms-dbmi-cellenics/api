const _ = require('lodash');
const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

const MockDataFactory = require('../../../src/api/services/__mocks__/MockDataFactory');

jest.mock('../../../src/api/route-services/samples');
jest.mock('../../../src/utils/authMiddlewares');

describe('tests for samples route', () => {
  let app = null;

  const dataFactory = new MockDataFactory({ projectId: 'projectId', experimentId: 'experimentId', sampleId: 'sample-1' });

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
    const correctSample = dataFactory.getSamplesEntry();

    request(app)
      .put('/v1/projects/projectId/experimentId/samples')
      .send(correctSample)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Updating with invalid sample body returns error 400', async (done) => {
    const correctSample = dataFactory.getSamplesEntry();

    const invalidBodySample = _.cloneDeep(correctSample);

    delete invalidBodySample['sample-1'].uuid;

    request(app)
      .put('/v1/projects/someId/experimentId/samples')
      .expect(400)
      .send(invalidBodySample)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Updating with extra properties does not return error', async (done) => {
    const correctSample = dataFactory.getSamplesEntry();

    const extraPropertiesBodySample = _.cloneDeep(correctSample);

    extraPropertiesBodySample['sample-1'].invalid = 'invalid';

    request(app)
      .put('/v1/projects/someId/experimentId/samples')
      .expect(200)
      .send(extraPropertiesBodySample)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Creating correct shape samples return 200 ', async (done) => {
    const correctSample = dataFactory.getSamplesEntry();

    request(app)
      .post('/v1/projects/projectId/experimentId/samples')
      .send(correctSample['sample-1'])
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Creating with invalid sample body returns error 400', async (done) => {
    const correctSample = dataFactory.getSamplesEntry();

    const invalidBodySample = _.cloneDeep(correctSample);

    delete invalidBodySample['sample-1'].uuid;

    request(app)
      .post('/v1/projects/someId/experimentId/samples')
      .expect(400)
      .send(invalidBodySample['sample-1'])
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Creating with extra properties does not return error', async (done) => {
    const correctSample = dataFactory.getSamplesEntry();

    const extraPropertiesBodySample = _.cloneDeep(correctSample);

    extraPropertiesBodySample['sample-1'].invalid = 'invalid';

    request(app)
      .post('/v1/projects/someId/experimentId/samples')
      .expect(200)
      .send(extraPropertiesBodySample['sample-1'])
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Deleting a sample returns 200 correctly with correct body', async (done) => {
    const correctDeleteBody = { ids: ['sample1Id'] };

    request(app)
      .delete('/v1/projects/projectUuid/experimentId/samples')
      .send(correctDeleteBody)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Deleting a samples returns 400 with invalid body (lacking ids)', async (done) => {
    const lackingIdsBoy = {};

    request(app)
      .delete('/v1/projects/projectUuid/experimentId/samples')
      .send(lackingIdsBoy)
      .expect(400)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Deleting a samples returns 400 with invalid body (unexpected extra properties)', async (done) => {
    const extraPropertiesBody = { ids: ['sample1Id'], invalid: 'invalid' };

    request(app)
      .delete('/v1/projects/projectUuid/experimentId/samples')
      .send(extraPropertiesBody)
      .expect(400)
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

  it('Getting an s3FileUploadUrl returns 200 correctly', async (done) => {
    request(app)
      .get('/v1/projects/projectUuid/samples/sampleUuid/fileName/uploadUrl')
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Getting an s3FileDownloadUrl returns 200 correctly', async (done) => {
    request(app)
      .get('/v1/projects/projectUuid/samples/sampleUuid/fileName/downloadUrl')
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });
});
