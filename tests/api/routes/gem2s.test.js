const express = require('express');
const request = require('supertest');
const https = require('https');
const _ = require('lodash');

const expressLoader = require('../../../src/loaders/express');
const CacheSingleton = require('../../../src/cache');
const { createGem2SPipeline } = require('../../../src/api/general-services/pipeline-manage');

const getLogger = require('../../../src/utils/getLogger');

jest.mock('aws-xray-sdk');
jest.mock('../../../src/utils/authMiddlewares');
jest.mock('../../../src/utils/authMiddlewares');
jest.mock('../../../src/utils/getLogger');
jest.mock('../../../src/cache');
jest.mock('../../../src/api/route-services/gem2s');
jest.mock('../../../src/api/general-services/pipeline-manage');
jest.mock('../../../src/api/route-services/experiment');

const mockLogger = {
  log: jest.fn(() => { }),
  error: jest.fn(() => { }),
  debug: jest.fn(() => { }),
  trace: jest.fn(() => { }),
  warn: jest.fn(() => { }),
};

getLogger.mockReturnValue(
  mockLogger,
);

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


describe('tests for gem2s route', () => {
  let app = null;

  beforeEach(async () => {
    CacheSingleton.createMock({});

    const mockApp = await expressLoader(express());
    app = mockApp.app;
  });

  afterEach(() => {
    mockLogger.log.mockClear();
    mockLogger.error.mockClear();
    jest.clearAllMocks();
  });

  it('Can handle valid notifications', async () => {
    let validMsg = _.cloneDeep(basicMsg);
    validMsg.Type = 'Notification';
    validMsg = JSON.stringify(validMsg);

    await request(app)
      .post('/v1/gem2sResults')
      .send(validMsg)
      .set('Content-type', 'text/plain')
      .expect(200)
      .expect('ok');

    expect(mockLogger.error).toHaveBeenCalledTimes(0);
  });

  it('Returns nok for invalid notifications', async () => {
    let invalidMsg = _.cloneDeep(basicMsg);
    invalidMsg.Type = 'InvalidNotification';
    invalidMsg = JSON.stringify(invalidMsg);

    await request(app)
      .post('/v1/gem2sResults')
      .send(invalidMsg)
      .set('Content-type', 'text/plain')
      .expect(200)
      .expect('nok');

    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('Validating the response throws an error', async () => {
    const invalidMsg = JSON.stringify(basicMsg);
    https.get = jest.fn();

    await request(app)
      .post('/v1/gem2sResults')
      .send(invalidMsg)
      .set('Content-type', 'text/plain')
      .expect(200)
      .expect('nok');

    expect(mockLogger.error).toHaveBeenCalled();
    expect(https.get).toHaveBeenCalledTimes(0);
  });

  it('Can handle message subscription', async () => {
    let validMsg = _.cloneDeep(basicMsg);
    validMsg.Type = 'SubscriptionConfirmation';
    validMsg = JSON.stringify(validMsg);

    https.get = jest.fn();

    await request(app)
      .post('/v1/gem2sResults')
      .send(validMsg)
      .set('Content-type', 'text/plain')
      .expect(200);

    expect(mockLogger.error).toHaveBeenCalledTimes(0);
    expect(https.get).toHaveBeenCalledTimes(1);
  });

  it('Can handle message unsubscription', async () => {
    let validMsg = _.cloneDeep(basicMsg);
    validMsg.Type = 'UnsubscribeConfirmation';
    validMsg = JSON.stringify(validMsg);

    https.get = jest.fn();

    await request(app)
      .post('/v1/gem2sResults')
      .send(validMsg)
      .set('Content-type', 'text/plain')
      .expect(200);

    expect(mockLogger.error).toHaveBeenCalledTimes(0);
    expect(https.get).toHaveBeenCalledTimes(1);
  });

  it('Returns an error for malformed work', async () => {
    const brokenMsg = '';

    await request(app)
      .post('/v1/gem2sResults')
      .send(brokenMsg)
      .set('Content-type', 'text/plain')
      .expect(200)
      .expect('nok');
  });

  it('Returns an error when message in sns is malformed', async () => {
    let invalidMsg = _.cloneDeep(basicMsg);
    invalidMsg.Type = 'NotificationMalformed';
    invalidMsg = JSON.stringify(invalidMsg);

    await request(app)
      .post('/v1/gem2sResults')
      .send(invalidMsg)
      .set('Content-type', 'text/plain')
      .expect(200)
      .expect('nok');

    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('Creates a new pipeline for gem2s execution', async (done) => {
    createGem2SPipeline.mockReturnValue({});

    request(app)
      .post('/v1/experiments/someId/gem2s')
      .send({ paramsHash: 'new-params-hash' })
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Gem2s creation endpoint returns error if not given the correct params', async (done) => {
    createGem2SPipeline.mockReturnValue({});

    request(app)
      .post('/v1/experiments/someId/gem2s')
      .send({ wrongKey: 'wong-value' })
      .expect(400)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });

  it('Gem2s creation endpoint returns error if not given a payload', async (done) => {
    createGem2SPipeline.mockReturnValue({});

    request(app)
      .post('/v1/experiments/someId/gem2s')
      .expect(415)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });
});
