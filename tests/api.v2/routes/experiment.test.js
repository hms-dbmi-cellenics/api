// @ts-nocheck
const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

const { OK } = require('../../../src/utils/responses');

const experimentController = require('../../../src/api.v2/controllers/experimentController');

const getExperimentResponse = require('../mocks/data/getExperimentResponse');

jest.mock('../../../src/api.v2/controllers/experimentController', () => ({
  createExperiment: jest.fn(),
  getExperiment: jest.fn(),
  patchExperiment: jest.fn(),
  updateSamplePosition: jest.fn(),
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

  it('Creating a new experiment results in a successful response', async (done) => {
    experimentController.createExperiment.mockImplementationOnce((req, res) => res.json(OK()));

    const experimentId = 'experiment-id';

    const newExperimentData = {
      id: experimentId,
      name: 'experimentName',
      description: 'experimentDescription',
    };

    request(app)
      .post(`/v2/experiments/${experimentId}`)
      .send(newExperimentData)
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
    experimentController.createExperiment.mockImplementationOnce((req, res) => res.json(OK()));

    const experimentId = 'experiment-id';

    const invalidExperimentData = {
      description: 'experimentDescription',
    };

    request(app)
      .post(`/v2/experiments/${experimentId}`)
      .send(invalidExperimentData)
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

  it('getExperiment results in a successful response', async (done) => {
    const experimentId = 'experiment-id';

    experimentController.getExperiment.mockImplementationOnce(
      (req, res) => res.json(getExperimentResponse),
    );

    request(app)
      .get(`/v2/experiments/${experimentId}`)
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

  it('patchExperiment valid body works', async (done) => {
    const experimentId = 'experiment-id';

    const body = {
      notifyByEmail: true,
    };

    experimentController.patchExperiment.mockImplementationOnce((req, res) => res.json(OK()));

    request(app)
      .patch(`/v2/experiments/${experimentId}`)
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

  it('patchExperiment invalid body fails 400', async (done) => {
    const experimentId = 'experiment-id';

    const body = {
      notifyByEmail: 'true',
    };

    experimentController.patchExperiment.mockImplementationOnce((req, res) => res.json(OK()));

    request(app)
      .patch(`/v2/experiments/${experimentId}`)
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

  it('updateSamplePosition valid body works', async (done) => {
    const experimentId = 'experiment-id';

    const body = {
      oldPosition: 4,
      newPosition: 1,
    };

    experimentController.updateSamplePosition.mockImplementationOnce((req, res) => res.json(OK()));

    request(app)
      .put(`/v2/experiments/${experimentId}/samples/position`)
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

  it('updateSamplePosition invalid body fails 400', async (done) => {
    const experimentId = 'experiment-id';

    const body = {
      oldPosition: 4,
    };

    experimentController.updateSamplePosition.mockImplementationOnce((req, res) => res.json(OK()));

    request(app)
      .put(`/v2/experiments/${experimentId}/samples/position`)
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
});
