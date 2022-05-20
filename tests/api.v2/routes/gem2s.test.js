// @ts-nocheck
const express = require('express');
const request = require('supertest');
const expressLoader = require('../../../src/loaders/express');

const { OK } = require('../../../src/utils/responses');

const gem2sController = require('../../../src/api.v2/controllers/gem2sController');

jest.mock('../../../src/api.v2/controllers/gem2sController', () => ({
  runGem2s: jest.fn(),
  handleResponse: jest.fn(),
}));

jest.mock('../../../src/api.v2/middlewares/authMiddlewares');

describe('tests for gem2s route', () => {
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

  it('Creating a new gem2s run results in a successful response', async (done) => {
    gem2sController.runGem2s.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    const experimentId = 'experiment-id';

    const mockReq = { paramsHash: 'mockParamsHash' };

    request(app)
      .post(`/v2/experiments/${experimentId}/gem2s`)
      .send(mockReq)
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

  it('Creating a new gem2s run with an invalid body fails', async (done) => {
    gem2sController.runGem2s.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    const experimentId = 'experiment-id';

    const mockReqBody = { paramsHashInvalidKey: 'mockParamsHash' };

    request(app)
      .post(`/v2/experiments/${experimentId}/gem2s`)
      .send(mockReqBody)
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

  it('Sending a gem2sResult results in a successful response', async (done) => {
    gem2sController.handleResponse.mockImplementationOnce((req, res) => {
      res.json(OK());
      return Promise.resolve();
    });

    const mockBody = {
      Type: 'Notification',
      MessageId: 'ce0a05bf-c500-4dc7-8d0d-2ba974bf2831',
      TopicArn: 'arn:aws:sns:eu-west-1:000000000000:work-results-development-default-v2',
      Message: '{a: "the actual message"}',
      Timestamp: '2022-05-10T17:03:16.542Z',
      SignatureVersion: '1',
      Signature: 'EXAMPLEpH+..',
      SigningCertURL: 'https://sns.us-east-1.amazonaws.com/SimpleNotificationService-0000000000000000000000.pem',
      UnsubscribeURL: 'http://localhost:4566/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:eu-west-1:000000000000:work-results-development-default-v2:18c4de8d-e180-485a-9b79-de0b173b7db8',
      MessageAttributes: {
        type: {
          Type: 'String',
          Value: 'GEM2SResponse',
        },
      },
    };

    request(app)
      .post('/v2/gem2sResults')
      .send(mockBody)
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
