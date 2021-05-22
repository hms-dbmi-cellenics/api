const AWSMock = require('aws-sdk-mock');
const AWS = require('../../src/utils/requireAWS');

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
  const dynamodbData = Object.keys(response.Responses).reduce((acc, tableName) => ({
    ...acc,
    Responses: {
      ...acc.Responses,
      [tableName]: response.Responses[tableName].map((entry) => AWS.DynamoDB.Converter.marshall(entry)),
    },
  }), { Responses: {} });

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

module.exports = {
  mockDynamoGetItem,
  mockDynamoBatchGetItem,
  mockDynamoQuery,
  mockDynamoScan,
  mockDynamoUpdateItem,
  mockDynamoDeleteItem,
  mockS3GetObject,
  mockS3PutObject,
};
