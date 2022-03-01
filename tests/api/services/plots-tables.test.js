const AWSMock = require('aws-sdk-mock');
const AWS = require('../../../src/utils/aws/requireAWS');
const PlotsTablesService = require('../../../src/api/services/PlotsTablesService');
const { convertToDynamoDbRecord } = require('../../../src/utils/aws/dynamoDb');

// Mock dates so snapshots don't drift.
const constantDate = new Date('Wed Jan 01 2020');
/* eslint no-global-assign:off */
Date = class extends Date {
  constructor() {
    return constantDate;
  }
};

const EXPERIMENT_ID = '1';
const PLOT_UUID = 'plot1';

describe('Test Plot Config Service', () => {
  afterEach(() => {
    AWSMock.restore('DynamoDB');
  });

  it('create operation, puts data in database', async () => {
    const data = {
      foo: 'bar', baz: [1, 2, 3],
    };

    const updateItem = jest.fn();
    AWSMock.setSDKInstance(AWS);
    AWSMock.mock('DynamoDB', 'updateItem', (params, callback) => {
      updateItem(params);
      callback(null, data);
    });

    await new PlotsTablesService().create(EXPERIMENT_ID, PLOT_UUID, data);
    expect(updateItem).toMatchSnapshot();
  });

  it('delete operation, delete data from database', async () => {
    const deleteItem = jest.fn();
    AWSMock.setSDKInstance(AWS);
    AWSMock.mock('DynamoDB', 'deleteItem', (params, callback) => {
      deleteItem(params);
      callback(null, null);
    });

    await new PlotsTablesService().delete(EXPERIMENT_ID, PLOT_UUID);
    expect(deleteItem).toMatchSnapshot();
  });

  it('read operation, read data from database', async () => {
    const data = {
      Item: convertToDynamoDbRecord({
        foo: 'bar', baz: [1, 2, 3],
      }),
    };

    const getItem = jest.fn();
    AWSMock.setSDKInstance(AWS);
    AWSMock.mock('DynamoDB', 'getItem', (params, callback) => {
      getItem(params);
      callback(null, data);
    });

    await new PlotsTablesService().read(EXPERIMENT_ID, PLOT_UUID);
    expect(getItem).toMatchSnapshot();
  });
});
