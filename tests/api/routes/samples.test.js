const _ = require('lodash');
const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

jest.mock('../../../src/api/route-services/samples');
jest.mock('../../../src/utils/authMiddlewares');

describe('tests for samples route', () => {
  const filesObject = {
    lastModified: '2021-10-22T12:39:41.117Z',
    'matrix.mtx.gz': {
      valid: true,
      path: '9b5d23ef-b447-4239-8e17-714aa9a4d06e/matrix.mtx.gz',
      upload: {},
      name: 'matrix.mtx.gz',
      compressed: true,
      lastModified: '2021-10-22T12:39:41.033Z',
      bundle: {
        path: '/WT1/matrix.mtx.gz',
      },
      errors: '',
    },
    'features.tsv.gz': {
      valid: true,
      path: '9b5d23ef-b447-4239-8e17-714aa9a4d06e/matrix.mtx.gz',
      upload: {},
      name: 'matrix.mtx.gz',
      compressed: true,
      lastModified: '2021-10-22T12:39:41.033Z',
      bundle: {
        path: '/WT1/matrix.mtx.gz',
      },
      errors: '',
    },
    'barcodes.tsv.gz': {
      valid: true,
      path: '9b5d23ef-b447-4239-8e17-714aa9a4d06e/matrix.mtx.gz',
      upload: {},
      name: 'matrix.mtx.gz',
      compressed: true,
      lastModified: '2021-10-22T12:39:41.033Z',
      bundle: {
        path: '/WT1/matrix.mtx.gz',
      },
      errors: '',
    },
  };

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
      files: filesObject,
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
    const invalidBodySample = _.cloneDeep(correctSample);

    delete invalidBodySample['sample-1'].species;

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

  it('Updating with extra properties returns error 400', async (done) => {
    const extraPropertiesBodySample = _.cloneDeep(correctSample);

    extraPropertiesBodySample['sample-1'].invalid = 'invalid';

    request(app)
      .put('/v1/projects/someId/experimentId/samples')
      .expect(400)
      .send(extraPropertiesBodySample)
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
    const invalidBodySample = _.cloneDeep(correctSample);

    delete invalidBodySample['sample-1'].species;

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

  it('Creating with extra properties returns error 400', async (done) => {
    const extraPropertiesBodySample = _.cloneDeep(correctSample);

    extraPropertiesBodySample['sample-1'].invalid = 'invalid';

    request(app)
      .post('/v1/projects/someId/experimentId/samples')
      .expect(400)
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
