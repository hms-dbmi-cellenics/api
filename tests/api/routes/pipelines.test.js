const express = require('express');
const request = require('supertest');
const https = require('https');
const _ = require('lodash');
const getLogger = require('../../../src/utils/getLogger');
const expressLoader = require('../../../src/loaders/express');
const CacheSingleton = require('../../../src/cache');

jest.mock('sns-validator');
jest.mock('aws-xray-sdk');
jest.mock('../../../src/utils/getLogger');
jest.mock('../../../src/cache');

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

describe('PipelineResults route', () => {
  let app = null;

  beforeEach(async () => {
    CacheSingleton.createMock({});

    const mockApp = await expressLoader(express());
    app = mockApp.app;
  });

  afterEach(() => {
    mockLogger.log.mockClear();
    mockLogger.error.mockClear();
  });

  it('Can handle notifications', async () => {
    let validMsg = _.cloneDeep(basicMsg);
    validMsg.Type = 'Notification';
    validMsg = JSON.stringify(validMsg);

    const mockHandleResponse = jest.fn(() => { });
    jest.mock('../../../src/api/route-services/pipeline-response', () => ({ qcResponse: mockHandleResponse }));

    await request(app)
      .post('/v1/pipelineResults')
      .send(validMsg)
      .set('Content-type', 'text/plain')
      .expect(200);

    expect(mockLogger.error).toHaveBeenCalledTimes(0);
    expect(mockHandleResponse).toHaveBeenCalledTimes(1);
  });

  it('Validating the response throws an error', async () => {
    const invalidMsg = JSON.stringify(basicMsg);
    https.get = jest.fn();

    await request(app)
      .post('/v1/pipelineResults')
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
      .post('/v1/pipelineResults')
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
      .post('/v1/pipelineResults')
      .send(validMsg)
      .set('Content-type', 'text/plain')
      .expect(200);

    expect(mockLogger.error).toHaveBeenCalledTimes(0);
    expect(https.get).toHaveBeenCalledTimes(1);
  });

  it('Returns an error for malformed work', async () => {
    const brokenMsg = '';

    await request(app)
      .post('/v1/pipelineResults')
      .send(brokenMsg)
      .set('Content-type', 'text/plain')
      .expect(200)
      .expect('nok');
  });

  it('Returns an error when message in sns is malformed', async () => {
    let validMsg = _.cloneDeep(basicMsg);
    validMsg.Type = 'NotificationMalformed';
    validMsg = JSON.stringify(validMsg);

    const mockHandleResponse = jest.fn(() => { });
    jest.mock('../../../src/api/route-services/pipeline-response', () => mockHandleResponse);

    await request(app)
      .post('/v1/pipelineResults')
      .send(validMsg)
      .set('Content-type', 'text/plain')
      .expect(200)
      .expect('nok');

    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockHandleResponse).toHaveBeenCalledTimes(0);
  });
});
