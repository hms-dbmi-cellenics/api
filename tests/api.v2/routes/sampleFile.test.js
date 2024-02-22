// @ts-nocheck
const express = require('express');
const request = require('supertest');
const { get } = require('http');
const expressLoader = require('../../../src/loaders/express');

const { OK } = require('../../../src/utils/responses');

const sampleFileController = require('../../../src/api.v2/controllers/sampleFileController');

jest.mock('../../../src/api.v2/controllers/sampleFileController', () => ({
  createFile: jest.fn(),
  patchFile: jest.fn(),
  getS3DownloadUrl: jest.fn(),
  completeMultipart: jest.fn(),
  beginUpload: jest.fn(),
}));

jest.mock('../../../src/api.v2/middlewares/authMiddlewares');

describe('tests for experiment route', () => {
  let app = null;

  beforeEach(async () => {
    const mockApp = await expressLoader(express());
    app = mockApp.app;
  });

  afterEach(() => {
    /**
     * Most important since b'coz of caching, the mocked implementations sometimes does not reset
     */
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('Creating a new file results in a successful response', async (done) => {
    sampleFileController.createFile.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    const experimentId = 'experiment-id';
    const sampleId = 'sample-id';
    const sampleFileType = 'features.tsv.gz';

    const createFileBody = {
      sampleFileId: 'e3cf382a-cde4-43bd-a73c-705b5d053ca9',
      size: 120,
    };

    request(app)
      .post(`/v2/experiments/${experimentId}/samples/${sampleId}/sampleFiles/${sampleFileType}`)
      .send(createFileBody)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        // there is no point testing for the values of the response body
        // - if something is wrong, the schema validator will catch it
        return done();
      });
  });

  it('Creating a new experiment fails if body is invalid', async (done) => {
    sampleFileController.createFile.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    const experimentId = 'experiment-id';
    const sampleId = 'sample-id';
    const sampleFileType = 'features.tsv.gz';

    const createFileBody = {
      size: 120,
    };

    request(app)
      .post(`/v2/experiments/${experimentId}/samples/${sampleId}/sampleFiles/${sampleFileType}`)
      .send(createFileBody)
      .expect(400)
      .end((err) => {
        if (err) {
          return done(err);
        }
        // there is no point testing for the values of the response body
        // - if something is wrong, the schema validator will catch it
        return done();
      });
  });

  it('Patching a file upload status results in a successful response', async (done) => {
    sampleFileController.patchFile.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    const experimentId = 'experiment-id';
    const sampleFileId = 'sample-file-id';

    const patchFileBody = {
      uploadStatus: 'uploading',
    };

    request(app)
      .patch(`/v2/experiments/${experimentId}/sampleFiles/${sampleFileId}`)
      .send(patchFileBody)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        // there is no point testing for the values of the response body
        // - if something is wrong, the schema validator will catch it
        return done();
      });
  });

  it('Patching a file upload status fails if body is invalid', async (done) => {
    sampleFileController.patchFile.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    const experimentId = 'experiment-id';
    const sampleFileId = 'sample-file-id';

    const patchFileBody = {
      s3Path: 'features.tsv.gz',
    };

    request(app)
      .patch(`/v2/experiments/${experimentId}/sampleFiles/${sampleFileId}`)
      .send(patchFileBody)
      .expect(400)
      .end((err) => {
        if (err) {
          return done(err);
        }
        // there is no point testing for the values of the response body
        // - if something is wrong, the schema validator will catch it
        return done();
      });
  });

  it('beginUpload works', async (done) => {
    sampleFileController.beginUpload.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    const experimentId = 'mockExperimentId';
    const sampleFileId = 'mockSampleFileId';
    const metadata = {};

    const body = { metadata };

    request(app)
      .post(`/v2/experiments/${experimentId}/sampleFiles/${sampleFileId}/beginUpload`)
      .send(body)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        // there is no point testing for the values of the response body
        // - if something is wrong, the schema validator will catch it
        return done();
      });
  });

  it('beginUpload fails if validation doesnt match', async (done) => {
    sampleFileController.beginUpload.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    const experimentId = 'mockExperimentId';
    const sampleFileId = 'mockSampleFileId';
    const size = 10;

    // Metadata is missing
    const body = { size };

    request(app)
      .post(`/v2/experiments/${experimentId}/sampleFiles/${sampleFileId}/beginUpload`)
      .send(body)
      .expect(400)
      .end((err) => {
        if (err) {
          return done(err);
        }
        // there is no point testing for the values of the response body
        // - if something is wrong, the schema validator will catch it
        return done();
      });
  });

  it('Getting a sample file download url results in a successful response', async (done) => {
    sampleFileController.getS3DownloadUrl.mockImplementationOnce((req, res) => {
      res.json('mockSignedUrl');
      return Promise.resolve();
    });

    const experimentId = 'experiment-id';
    const sampleId = 'sample-id';
    const sampleFileType = 'features.tsv.gz';

    request(app)
      .get(`/v2/experiments/${experimentId}/samples/${sampleId}/files/${sampleFileType}/downloadUrl`)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        // there is no point testing for the values of the response body
        // - if something is wrong, the schema validator will catch it
        return done();
      });
  });
  it('Completing a multipart upload fails if body is invalid', async (done) => {
    sampleFileController.completeMultipart.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    const completeMultipartBody = {
      parts: [], uploadId: 'uploadId',
    };

    request(app)
      .post('/v2/completeMultipartUpload')
      .send(completeMultipartBody)
      .expect(400)
      .end((err) => {
        if (err) {
          return done(err);
        }
        // there is no point testing for the values of the response body
        // - if something is wrong, the schema validator will catch it
        return done();
      });
  });
});

