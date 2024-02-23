// @ts-nocheck

const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

const uploadController = require('../../../src/api.v2/controllers/uploadController');

jest.mock('../../../src/api.v2/controllers/uploadController', () => ({
  getUploadPartSignedUrl: jest.fn(),
}));

jest.mock('../../../src/api.v2/middlewares/authMiddlewares');

describe('tests for upload routes', () => {
  let app;

  beforeEach(async () => {
    const mockApp = await expressLoader(express());
    app = mockApp.app;
  });

  it('getUploadPartSignedUrl results in a successful response', async (done) => {
    uploadController.getUploadPartSignedUrl.mockImplementationOnce((req, res) => {
      res.json('mockSignedUrl');
      return Promise.resolve();
    });

    const queryParams = new URLSearchParams({ bucket: 'mockBucket', key: 'mockKey' });

    request(app)
      .get(`/v2/experiments/mockExperimentId/upload/mockUploadId/part/1/signedUrl?${queryParams}`)
      .expect(JSON.stringify('mockSignedUrl'))
      .end((err) => {
        if (err) {
          return done(err);
        }
        // there is no point testing for the values of the response body
        // - if something is wrong, the schema validator will catch it
        return done();
      });
  });

  it('getUploadPartSignedUrl fails 400 if query params are missing', async (done) => {
    uploadController.getUploadPartSignedUrl.mockImplementationOnce((req, res) => {
      res.json('mockSignedUrl');
      return Promise.resolve();
    });

    request(app)
      .get('/v2/experiments/mockExperimentId/upload/mockUploadId/part/1/signedUrl')
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
