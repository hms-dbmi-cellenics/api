// @ts-nocheck
const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

const { OK } = require('../../../src/utils/responses');

const metadataTrackController = require('../../../src/api.v2/controllers/metadataTrackController');

// jest.mock('../../../src/api.v2/controllers/metadataTrackController');
jest.mock('../../../src/api.v2/controllers/metadataTrackController');
jest.mock('../../../src/api.v2/middlewares/authMiddlewares');

const experimentId = 'experimentId';
const sampleId = 'sampleId';
const metadataTrackKey = 'metadataTrackKey';

describe('tests for metadata track routes', () => {
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

  it('Creating a new metadata track works', async (done) => {
    metadataTrackController.createMetadataTrack.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    request(app)
      .post(`/v2/experiments/${experimentId}/metadataTracks/${metadataTrackKey}`)
      .send()
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

  it('Patching a metadata track works', async (done) => {
    metadataTrackController.patchMetadataTrack.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    request(app)
      .patch(`/v2/experiments/${experimentId}/metadataTracks/${metadataTrackKey}`)
      .send({ key: 'newMetadataTrackKey' })
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

  it('Patching a metadata track with invalid body fails', async (done) => {
    metadataTrackController.patchMetadataTrack.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    request(app)
      .patch(`/v2/experiments/${experimentId}/metadataTracks/${metadataTrackKey}`)
      .send({ invalidKey: 'newMetadataTrackKey' })
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

  it('Deleting a metadata track works', async (done) => {
    metadataTrackController.deleteMetadataTrack.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    request(app)
      .delete(`/v2/experiments/${experimentId}/metadataTracks/${metadataTrackKey}`)
      .send()
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

  it('Patching the value a sample has in a metadata track works', async (done) => {
    metadataTrackController.patchValueForSample.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    request(app)
      .patch(`/v2/experiments/${experimentId}/samples/${sampleId}/metadataTracks/${metadataTrackKey}`)
      .send({ value: 'mockNewValue' })
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

  it('Patching the value a sample has in a metadata track with invalid request body fails', async (done) => {
    metadataTrackController.patchValueForSample.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    request(app)
      .patch(`/v2/experiments/${experimentId}/samples/${sampleId}/metadataTracks/${metadataTrackKey}`)
      .send({ invalidValue: 'mockNewValue' })
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

  it('creating metadata from file works', async (done) => {
    const tsvData = `sample1\tmetadata_key_1\tmetadata_value_1
  sample2\tmetadata_key_1\tmetadata_value_2
  sample1\tmetadata_key_2\tmetadata_value_3
  sample2\tmetadata_key_2\tmetadata_value_4`;
    metadataTrackController.createMetadataFromFile.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    request(app)
      .patch(`/v2/experiments/${experimentId}/metadataTracks`)
      .set('Content-Type', 'text/plain')
      .send(tsvData)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        expect(metadataTrackController.createMetadataFromFile).toHaveBeenCalled();
        return done();
      });
  });
});
