const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

jest.mock('../../../src/api.v2/controllers/experimentController');

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

  it('Creating a new experiment fails if body is wrong', async (done) => {
    const experimentId = 'experiment-id';

    const wrongExperimentData = {
      description: 'experimentDescription',
    };

    request(app)
      .post(`/v2/experiments/${experimentId}`)
      .send(wrongExperimentData)
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
