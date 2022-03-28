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
  const payloadToReturn = !Array.isArray(payload) ? [payload] : payload;

  const dynamodbData = {
    Items: payloadToReturn.map((entry) => AWS.DynamoDB.Converter.marshall(entry)),
  };
  const fnSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);
  AWSMock.mock('DynamoDB', 'query', (params, callback) => {
    fnSpy(params);
    callback(error, dynamodbData);
  });
  return fnSpy;
};

const mockDocClientPutItem = (payload = {}, error = null) => {
  const fnSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);
  AWSMock.mock('DynamoDB.DocumentClient', 'put', (params, callback) => {
    fnSpy(params);
    callback(error, payload);
  });
  return fnSpy;
};

const mockDocClientQuery = (payload = [], error = null) => {
  const payloadToReturn = !Array.isArray(payload) ? [payload] : payload;

  const dynamodbData = {
    Items: payloadToReturn,
  };
  const fnSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);
  AWSMock.mock('DynamoDB.DocumentClient', 'query', (params, callback) => {
    fnSpy(params);
    callback(error, dynamodbData);
  });
  return fnSpy;
};

const mockDocClientBatchWrite = (payload = {}, error = null) => {
  const fnSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);
  AWSMock.mock('DynamoDB.DocumentClient', 'batchWrite', (params, callback) => {
    fnSpy(params);
    callback(error, payload);
  });
  return fnSpy;
};

/**
 * Mocks the scan operation in dynamodb
 *
 * @param {Array} payloadPages the payloads to return in each scan operation in order
 *    (for pagination, also returns the LastEvaluatedKey if it has more than one page)
 * @returns An object containing descriptions of projects.
 */
const mockDynamoScan = (payloadPages, error = null) => {
  const pagesLength = payloadPages.length;
  const dynamodbDbDataPages = payloadPages.map((page, i) => {
    const isLastPage = pagesLength === i + 1;

    const lastKey = isLastPage ? null : AWS.DynamoDB.Converter.marshall(_.first(payloadPages[i + 1]));
    const items = page.map((entry) => AWS.DynamoDB.Converter.marshall(entry));

    const response = { Items: items };

    if (!isLastPage) {
      response.LastEvaluatedKey = lastKey;
    }

    return response;
  });

  const fnSpy = jest.fn((x) => x);
  AWSMock.setSDKInstance(AWS);

  let callNumber = 0;
  AWSMock.mock('DynamoDB', 'scan', (params, callback) => {
    fnSpy(params);

    callback(error, dynamodbDbDataPages[callNumber]);

    callNumber += 1;
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
  mockS3GetObjectTagging,
  mockDocClientQuery,
  mockDocClientBatchWrite,
  mockDocClientPutItem,
};
