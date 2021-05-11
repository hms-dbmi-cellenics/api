const AWSMock = require('aws-sdk-mock');
const AWS = require('../../src/utils/requireAWS');

const mockDynamoGetItem = (payload = {}, error = null) => {
  const dynamodbData = {
    Item: AWS.DynamoDB.Converter.marshall(payload),
  };
  const getItemSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);
  AWSMock.mock('DynamoDB', 'getItem', (params, callback) => {
    getItemSpy(params);
    callback(error, dynamodbData);
  });
  return getItemSpy;
};

const mockDynamoDeleteItem = (payload = {}, error = null) => {
  const getItemSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);
  AWSMock.mock('DynamoDB', 'deleteItem', (params, callback) => {
    getItemSpy(params);
    callback(error, payload);
  });
  return getItemSpy;
};

const mockDynamoQuery = (payload = {}, error = null) => {
  const dynamodbData = {
    Item: AWS.DynamoDB.Converter.marshall(payload),
  };
  const getItemSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);
  AWSMock.mock('DynamoDB', 'query', (params, callback) => {
    getItemSpy(params);
    callback(error, dynamodbData);
  });
  return getItemSpy;
};

const mockDynamoUpdateItem = (payload = {}, error = null) => {
  const dynamodbData = {
    Attributes: AWS.DynamoDB.Converter.marshall(payload),
  };
  const getItemSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);
  AWSMock.mock('DynamoDB', 'updateItem', (params, callback) => {
    getItemSpy(params);
    callback(error, dynamodbData);
  });
  return getItemSpy;
};

const mockS3GetObject = (payload = {}, error = null) => {
  const getObjectSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);
  AWSMock.mock('S3', 'getObject', (params, callback) => {
    getObjectSpy(params);
    callback(error, payload);
  });

  return getObjectSpy;
};

const mockS3PutObject = (payload = {}, error = null) => {
  const putObjectSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);

  AWSMock.mock('S3', 'putObject', (params, callback) => {
    putObjectSpy(params);
    callback(error, payload);
  });

  return putObjectSpy;
};

module.exports = {
  mockDynamoGetItem,
  mockDynamoQuery,
  mockDynamoUpdateItem,
  mockDynamoDeleteItem,
  mockS3GetObject,
  mockS3PutObject,
};
