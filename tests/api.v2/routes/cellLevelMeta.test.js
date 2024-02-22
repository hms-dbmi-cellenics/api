// @ts-nocheck
const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');
const { OK } = require('../../../src/utils/responses');

const cellLevelMetaController = require('../../../src/api.v2/controllers/cellLevelMetaController');

jest.mock('../../../src/api.v2/controllers/cellLevelMetaController', () => ({
  upload: jest.fn(), update: jest.fn(), download: jest.fn(), deleteMeta: jest.fn(),
}));
jest.mock('../../../src/api.v2/middlewares/authMiddlewares');
const experimentId = 'experiment-id';

const newCellLevelFileData = {
  name: 'metaDataName',
};

describe('cell level metadata route', () => {
  let app = null;

  beforeEach(async () => {
    const mockApp = await expressLoader(express());
    app = mockApp.app;
  });

  it('Creating a new cell level meta file results in a successful response', async (done) => {
    cellLevelMetaController.upload.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    request(app)
      .post(`/v2/experiments/${experimentId}/cellLevelMeta`)
      .send(newCellLevelFileData)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('downloading a new cell level meta file results in a successful response', async (done) => {
    cellLevelMetaController.download.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });
    const fileId = 'some-uuid-of-a-file';
    const fileName = 'helloIamFile.tsv';
    request(app)
      .get(`/v2/experiments/${experimentId}/cellLevelMeta/${fileId}/${fileName}`)
      .send(newCellLevelFileData)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });
  it('Deleting a new cell level meta file results in a successful response', async (done) => {
    cellLevelMetaController.deleteMeta.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    request(app)
      .delete(`/v2/experiments/${experimentId}/cellLevelMeta`)
      .send(newCellLevelFileData)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });
  it('updating a new cell level meta file results in a successful response', async (done) => {
    cellLevelMetaController.update.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });
    const currentRequest = { uploadStatus: 'uploaded' };
    request(app)
      .patch(`/v2/experiments/${experimentId}/cellLevelMeta`)
      .send(currentRequest)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });
});
