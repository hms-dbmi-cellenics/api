const request = require('supertest');
const express = require('express');
const expressLoader = require('../../../src/loaders/express');

const workController = require('../../../src/api.v2/controllers/workController');
const { OK } = require('../../../src/utils/responses');

jest.mock('../../../src/api.v2/middlewares/authMiddlewares');
jest.mock('../../../src/api.v2/controllers/workController');

describe('work routes tests', () => {
  let app = null;

  beforeEach(async () => {
    const mockApp = await expressLoader(express());
    app = mockApp.app;
  });


  it('Get work request returns 200', async (done) => {
    workController.submitWork.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    request(app)
      .post('/v2/workRequest/someExperimentId')
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });
});
