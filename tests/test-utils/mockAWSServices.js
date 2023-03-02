const AWSMock = require('aws-sdk-mock');
const _ = require('lodash');
const AWS = require('../../src/utils/requireAWS');

const mockS3GetObject = (payload = {}, error = null) => {
  const fnSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);
  AWSMock.mock('S3', 'getObject', (params, callback) => {
    fnSpy(params);
    callback(error, payload);
  });

  return fnSpy;
};

const mockS3GetObjectTagging = (payload = {}, error = null) => {
  const fnSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);
  AWSMock.mock('S3', 'getObjectTagging', (params, callback) => {
    fnSpy(params);
    callback(error, payload);
  });
  return fnSpy;
};

const mockS3PutObject = (payload = {}, error = null) => {
  const fnSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);
  AWSMock.mock('S3', 'putObject', (params, callback) => {
    fnSpy(params);
    callback(error, payload);
  });

  return fnSpy;
};

const mockS3GetSignedUrl = (payload = {}, error = null) => {
  const fnSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);
  AWSMock.mock('S3', 'getSignedUrl', (command, params, callback) => {
    fnSpy(command, params);
    callback(error, payload);
  });

  return fnSpy;
};

const mockBatchTerminateJob = (payload = {}, error = null) => {
  const fnSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);
  AWSMock.mock('Batch', 'terminateJob', (params, callback) => {
    fnSpy(params);
    callback(error, payload);
  });

  return fnSpy;
};

const mockBatchListJobs = (payload = {}, error = null) => {
  const fnSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);
  AWSMock.mock('Batch', 'listJobs', (params, callback) => {
    fnSpy(params);
    callback(error, payload);
  });

  return fnSpy;
};

module.exports = {
  mockS3GetObject,
  mockS3PutObject,
  mockS3GetSignedUrl,
  mockS3GetObjectTagging,
  mockBatchTerminateJob,
  mockBatchListJobs,
};
