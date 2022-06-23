// @ts-nocheck
const express = require('express');
const request = require('supertest');
const { send } = require('process');
const expressLoader = require('../../../src/loaders/express');

const { OK } = require('../../../src/utils/responses');

const experimentController = require('../../../src/api.v2/controllers/experimentController');

const getExperimentResponse = require('../mocks/data/getExperimentResponse.json');
const getAllExperimentsResponse = require('../mocks/data/getAllExperimentsResponse.json');
const getProcessingConfigResponse = require('../mocks/data/getProcessingConfigResponse.json');

jest.mock('../../../src/api.v2/controllers/experimentController', () => ({
  getAllExperiments: jest.fn(),
  getExperiment: jest.fn(),
  createExperiment: jest.fn(),
  patchExperiment: jest.fn(),
  deleteExperiment: jest.fn(),
  updateSamplePosition: jest.fn(),
  getProcessingConfig: jest.fn(),
  updateProcessingConfig: jest.fn(),
  downloadData: jest.fn(),
  getExampleExperiments: jest.fn(),
  cloneExperiment: jest.fn(),
}));

jest.mock('../../../src/api.v2/middlewares/authMiddlewares');

describe('tests for experiment route', () => {
  let app = null;

  beforeEach(async () => {
    const mockApp = await expressLoader(express());
    app = mockApp.app;
  });

  it('Creating a new experiment results in a successful response', async (done) => {
    experimentController.createExperiment.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

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
    experimentController.createExperiment.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

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

    experimentController.getExperiment.mockImplementationOnce((req, res) => {
      res.json(getExperimentResponse);
      return Promise.resolve();
    });

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

    experimentController.patchExperiment.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

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

    experimentController.patchExperiment.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

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

  it('deleteExperiment valid body works', async (done) => {
    const experimentId = 'experiment-id';

    const body = {
      notifyByEmail: true,
    };

    experimentController.deleteExperiment.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    request(app)
      .delete(`/v2/experiments/${experimentId}`)
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



  it('updateSamplePosition valid body works', async (done) => {
    const experimentId = 'experiment-id';

    const body = {
      oldPosition: 4,
      newPosition: 1,
    };

    experimentController.updateSamplePosition.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

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

    experimentController.updateSamplePosition.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

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

  it('getAllExperiments results in a successful response', async (done) => {
    experimentController.getAllExperiments.mockImplementationOnce((req, res) => {
      res.json(getAllExperimentsResponse);
      return Promise.resolve();
    });

    request(app)
      .get('/v2/experiments/')
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

  it('getProcessingConfig works', async (done) => {
    const experimentId = 'experiment-id';
    experimentController.getProcessingConfig.mockImplementationOnce((req, res) => {
      res.json(getProcessingConfigResponse);
      return Promise.resolve();
    });
    request(app)
      .get(`/v2/experiments/${experimentId}/processingConfig`)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('updateProcessingConfig works', async (done) => {
    const experimentId = 'experiment-id';

    experimentController.updateProcessingConfig.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });
    request(app)
      .put(`/v2/experiments/${experimentId}/processingConfig`)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Download data works', (done) => {
    const experimentId = 'experiment-id';
    const downloadType = 'processed_seurat_object';
    experimentController.downloadData.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });
    request(app)
      .get(`/v2/experiments/${experimentId}/download/${downloadType}`)
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('getExampleExperiments results in a successful response', async (done) => {
    experimentController.getExampleExperiments.mockImplementationOnce((req, res) => {
      res.json(getExperimentResponse);
      return Promise.resolve();
    });

    request(app)
      .get('/v2/experiments/examples')
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

  it('cloneExperiment results in a successful response without a body', async (done) => {
    const experimentId = 'fromExperimentId';

    experimentController.cloneExperiment.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    request(app)
      .post(`/v2/experiments/${experimentId}/clone`)
      .set({ 'Content-Type': 'application/json' })
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

  it('cloneExperiment results in a successful response with a valid body', async (done) => {
    const experimentId = 'fromExperimentId';

    const body = { samplesSubsetIds: ['sampleId1', 'sampleId2'] };

    experimentController.cloneExperiment.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    request(app)
      .post(`/v2/experiments/${experimentId}/clone`)
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

  it('cloneExperiment results in a 400 with an invalid body', async (done) => {
    const experimentId = 'fromExperimentId';

    const body = { samplesSubsetIdsInvalid: ['sampleId1', 'sampleId2'] };

    experimentController.cloneExperiment.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    request(app)
      .post(`/v2/experiments/${experimentId}/clone`)
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
