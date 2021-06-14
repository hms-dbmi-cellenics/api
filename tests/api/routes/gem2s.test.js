const express = require('express');
const request = require('supertest');
const https = require('https');
const _ = require('lodash');

const logger = require('../../../src/utils/logging');
const expressLoader = require('../../../src/loaders/express');
const CacheSingleton = require('../../../src/cache');
const Gem2sService = require('../../../src/api/route-services/gem2s');
const { createGem2SPipeline } = require('../../../src/api/general-services/pipeline-manage');

jest.mock('sns-validator');
jest.mock('aws-xray-sdk');
jest.mock('../../../src/utils/authMiddlewares');
jest.mock('../../../src/utils/logging');
jest.mock('../../../src/cache');
jest.mock('../../../src/api/route-services/gem2s');
jest.mock('../../../src/api/general-services/pipeline-manage');
jest.mock('../../../src/api/route-services/experiment');

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
    logger.log.mockClear();
    logger.error.mockClear();
    jest.clearAllMocks();
  });

  it('Can handle valid notifications', async () => {
    let validMsg = _.cloneDeep(basicMsg);
    validMsg.Type = 'Notification';
    validMsg = JSON.stringify(validMsg);

    Gem2sService.gem2sResponse.mockImplementation(() => { });

    await request(app)
      .post('/v1/gem2sResults')
      .send(validMsg)
      .set('Content-type', 'text/plain')
      .expect(200)
      .expect('ok');

    expect(logger.error).toHaveBeenCalledTimes(0);
    expect(Gem2sService.gem2sResponse).toHaveBeenCalledTimes(1);
  });

  it('Returns nok for invalid notifications', async () => {
    let validMsg = _.cloneDeep(basicMsg);
    validMsg.Type = 'Notification';
    validMsg = JSON.stringify(validMsg);

    Gem2sService.gem2sResponse.mockImplementation(() => { throw new Error(); });

    await request(app)
      .post('/v1/gem2sResults')
      .send(validMsg)
      .set('Content-type', 'text/plain')
      .expect(200)
      .expect('nok');

    expect(logger.error).toHaveBeenCalled();
    expect(Gem2sService.gem2sResponse).toHaveBeenCalledTimes(1);
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

    expect(logger.error).toHaveBeenCalled();
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

    expect(logger.error).toHaveBeenCalledTimes(0);
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

    expect(logger.error).toHaveBeenCalledTimes(0);
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
    let validMsg = _.cloneDeep(basicMsg);
    validMsg.Type = 'NotificationMalformed';
    validMsg = JSON.stringify(validMsg);

    Gem2sService.gem2sResponse.mockImplementation(() => { });

    await request(app)
      .post('/v1/gem2sResults')
      .send(validMsg)
      .set('Content-type', 'text/plain')
      .expect(200)
      .expect('nok');

    expect(logger.error).toHaveBeenCalled();
  });

  it('Creates a new pipeline for gem2s execution', async (done) => {
    createGem2SPipeline.mockReturnValue({});
    Gem2sService.gem2sCreate.mockImplementation(
      async () => ({ stateMachineArn: 'statemachine', executionArn: 'execution' }),
    );

    request(app)
      .post('/v1/experiments/someId/gem2s')
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        return done();
      });
  });
});
