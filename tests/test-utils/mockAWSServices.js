const AWSMock = require('aws-sdk-mock');
const _ = require('lodash');
const AWS = require('../../src/utils/requireAWS');

const marshallTableResults = (entries) => entries.map(
  (entry) => AWS.DynamoDB.Converter.marshall(entry),
);

const mockDynamoGetItem = (payload = {}, error = null) => {
  const dynamodbData = {
    Item: AWS.DynamoDB.Converter.marshall(payload),
  };

  const fnSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);
  AWSMock.mock('DynamoDB', 'getItem', (params, callback) => {
    fnSpy(params);
    callback(error, dynamodbData);
  });
  return fnSpy;
};

const mockDynamoBatchGetItem = (response = {}, error = null) => {
  const dynamodbData = {
    Responses: _.mapValues(response.Responses, marshallTableResults),
  };

  const fnSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);
  AWSMock.mock('DynamoDB', 'batchGetItem', (params, callback) => {
    fnSpy(params);
    callback(error, dynamodbData);
  });
  return fnSpy;
};

const mockDynamoDeleteItem = (payload = {}, error = null) => {
  const fnSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);
  AWSMock.mock('DynamoDB', 'deleteItem', (params, callback) => {
    fnSpy(params);
    callback(error, payload);
  });
  return fnSpy;
};

const mockDynamoQuery = (payload = [], error = null) => {
  if (!Array.isArray(payload)) {
    // eslint-disable-next-line no-param-reassign
    payload = [payload];
  }

  const dynamodbData = {
    Items: payload.map((entry) => AWS.DynamoDB.Converter.marshall(entry)),
  };
  const fnSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);
  AWSMock.mock('DynamoDB', 'query', (params, callback) => {
    fnSpy(params);
    callback(error, dynamodbData);
  });
  return fnSpy;
};

const mockDynamoScan = (payload = {}, error = null) => {
  if (!Array.isArray(payload)) {
    // eslint-disable-next-line no-param-reassign
    payload = [payload];
  }

  const dynamodbData = {
    Items: payload.map((entry) => AWS.DynamoDB.Converter.marshall(entry)),
  };
  const fnSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);
  AWSMock.mock('DynamoDB', 'scan', (params, callback) => {
    fnSpy(params);
    callback(error, dynamodbData);
  });
  return fnSpy;
};

const mockDynamoUpdateItem = (payload = {}, error = null) => {
  const dynamodbData = {
    Attributes: AWS.DynamoDB.Converter.marshall(payload),
  };
  const fnSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);
  AWSMock.mock('DynamoDB', 'updateItem', (params, callback) => {
    fnSpy(params);
    callback(error, dynamodbData);
  });
  return fnSpy;
};

const mockS3GetObject = (payload = {}, error = null) => {
  const fnSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);
  AWSMock.mock('S3', 'getObject', (params, callback) => {
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

const mockS3DeleteObject = (payload = {}, error = null) => {
  const fnSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);

  AWSMock.mock('S3', 'deleteObject', (params, callback) => {
    fnSpy(params);
    callback(error, payload);
  });

  return fnSpy;
};


const mockS3DeleteObjects = (payload = {}, error = null) => {
  const fnSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);

  AWSMock.mock('S3', 'deleteObjects', (params, callback) => {
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

module.exports = {
  mockDynamoGetItem,
  mockDynamoBatchGetItem,
  mockDynamoQuery,
  mockDynamoScan,
  mockDynamoUpdateItem,
  mockDynamoDeleteItem,
  mockS3GetObject,
  mockS3PutObject,
  mockS3DeleteObject,
  mockS3DeleteObjects,
  mockS3GetSignedUrl,
};
