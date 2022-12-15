const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

const subsetController = require('../../../src/api.v2/controllers/subsetController');

jest.mock('../../../src/utils/getLogger');
jest.mock('../../../src/api.v2/controllers/subsetController');
jest.mock('../../../src/api.v2/middlewares/authMiddlewares');

const experimentId = 'mockExperimentId';

describe('PipelineResults route', () => {
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


  it('Starting a new qc pipeline results in a successful response', async (done) => {
    const childExperimentId = 'mockChildExperimentId';

    subsetController.runSubset.mockImplementationOnce((req, res) => {
      res.json(childExperimentId);
      return Promise.resolve();
    });

    request(app)
      .post(`/v2/experiments/${experimentId}/subset`)
      .send({
        name: 'childExperimentName',
        cellSetKeys: ['louvain-1', 'mock-sample-1-id'],
      })
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
});
