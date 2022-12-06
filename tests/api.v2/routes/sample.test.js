// @ts-nocheck
const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

const { OK } = require('../../../src/utils/responses');

const sampleController = require('../../../src/api.v2/controllers/sampleController');

jest.mock('../../../src/api.v2/controllers/sampleController', () => ({
  createSamples: jest.fn(),
  deleteSample: jest.fn(),
  patchSample: jest.fn(),
  updateSamplesOptions: jest.fn(),
  getSamples: jest.fn(),
}));

jest.mock('../../../src/api.v2/middlewares/authMiddlewares');

const experimentId = 'experimentId';
const sampleId = 'sampleId';

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

  it('Creating new samples works', async (done) => {
    sampleController.createSamples.mockImplementationOnce((req, res) => {
      res.json(['id1']);
      return Promise.resolve();
    });

    const samplesData = [{
      name: 'sampleName',
      sampleTechnology: '10x',
      options: {},
    }];

    request(app)
      .post(`/v2/experiments/${experimentId}/samples`)
      .send(samplesData)
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

  it('Creating a new sample fails if request body is invalid', async (done) => {
    sampleController.createSamples.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    const invalidSampleData = [{
      name: 'sampleName',
      sampleTechnology: 'Invalidtechnology',
    }];

    request(app)
      .post(`/v2/experiments/${experimentId}/samples`)
      .send(invalidSampleData)
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

  it('Deleting a sample works', async (done) => {
    sampleController.deleteSample.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    request(app)
      .delete(`/v2/experiments/${experimentId}/samples/${sampleId}`)
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

  it('Patching a sample works', async (done) => {
    sampleController.patchSample.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    request(app)
      .patch(`/v2/experiments/${experimentId}/samples/${sampleId}`)
      .send({ name: 'newSampleName' })
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

  it('Patching a sample fails if requestBody is invalid', async (done) => {
    sampleController.patchSample.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    request(app)
      .patch(`/v2/experiments/${experimentId}/samples/${sampleId}`)
      .send({ aName: 'newSampleName' })
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

  it('updateSamplesOptions without a body works', async (done) => {
    const body = {};

    sampleController.updateSamplesOptions.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    request(app)
      .put(`/v2/experiments/${experimentId}/samples/options`)
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

  it('updateSamplesOptions with valid body works', async (done) => {
    const body = {
      includeAbSeq: false,
    };

    sampleController.updateSamplesOptions.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    request(app)
      .put(`/v2/experiments/${experimentId}/samples/options`)
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

  it('updateSamplesOptions with invalid body fails', async (done) => {
    const body = {
      someOption: true,
      otherOption: false,
    };

    sampleController.updateSamplesOptions.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    request(app)
      .put(`/v2/experiments/${experimentId}/samples/options`)
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

  it('Getting all samples works', async (done) => {
    sampleController.getSamples.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    request(app)
      .get(`/v2/experiments/${experimentId}/samples`)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });
});
