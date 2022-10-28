const _ = require('lodash');
const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

const { OK } = require('../../../src/utils/responses');

jest.mock('../../../src/utils/getLogger');

const qcController = require('../../../src/api.v2/controllers/qcController');

jest.mock('../../../src/api.v2/controllers/qcController', () => ({
  getQCState: jest.fn(),
  runQC: jest.fn(),
  handleResponse: jest.fn(),
}));

jest.mock('../../../src/api.v2/middlewares/authMiddlewares');

const experimentId = 'mockExperimentId';

const basicMsg = {
  MessageId: 'da8827d4-ffc2-5efb-82c1-70f929b2081d',
  ResponseMetadata: {
    RequestId: '826314a1-e99f-5fe7-b845-438c3fef9901',
    HTTPStatusCode: 200,
    HTTPHeaders: {
      'x-amzn-requestid': '826314a1-e99f-5fe7-b845-438c3fef9901',
      'content-type': 'text/xml',
      'content-length': '294',
      date: 'Thu, 07 May 2020 09:26:08 GMT',
    },
    RetryAttempts: 0,
  },
};

describe('PipelineResults route', () => {
  let app = null;

  beforeEach(async () => {
    const mockApp = await expressLoader(express());
    app = mockApp.app;
  });

  it('Starting a new qc pipeline results in a successful response', async (done) => {
    qcController.runQC.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    request(app)
      .post(`/v2/experiments/${experimentId}/qc`)
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
});
