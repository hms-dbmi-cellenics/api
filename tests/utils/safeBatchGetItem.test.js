const _ = require('lodash');

const safeBatchGetItem = require('../../src/utils/safeBatchGetItem');

const generateTableEntry = (amountOfKeys) => ({
  AttributesToGet: ['attributeId'],
  ConsistentRead: true,
  ExpressionAttributeNames: {},
  Keys: _.range(amountOfKeys).map((index) => ({ key: index })),
  ProjectionExpression: 'projectionExpressionValue',
});

const addTableEntry = (params, tableName, tableKeyArray) => ({
  ...params,
  RequestItems: {
    ...params.RequestItems,
    [tableName]: tableKeyArray,
  },
});

const generateTestParams = (amountOfKeys) => ({
  RequestItems: {
    tableName: generateTableEntry(amountOfKeys),
  },
  ReturnConsumedCapacity: 'returnConsumedCapacityValue',
});

let allParams = [];
let lastBatchGetItemParams;

const mockDynamodb = (response = {}) => {
  allParams = [];
  lastBatchGetItemParams = undefined;

  return {
    batchGetItem: (params) => ({
      promise: () => {
        lastBatchGetItemParams = params;
        allParams.push(params);
        return Promise.resolve(response);
      },
    }),
  };
};

describe('safeBatchGetItem', () => {
  it('uses the same params if they don\'t exceed 100 keys', async () => {
    const dynamodb = mockDynamodb();
    const params = generateTestParams(50);

    await safeBatchGetItem(dynamodb, params);

    // Generates the same params as received
    expect(lastBatchGetItemParams).toEqual(params);
  });

  it('splits the params if they exceed 100 keys', async () => {
    const dynamodb = mockDynamodb();
    const params = generateTestParams(150);

    await safeBatchGetItem(dynamodb, params);

    // Doesn't generate the same params as received
    expect(lastBatchGetItemParams).not.toEqual(params);

    // Was split into 2 calls
    expect(allParams.length).toEqual(2);

    // Keys were split correctly
    expect(allParams).toMatchSnapshot();
  });

  it('Returns correctly the result when under 100', async () => {
    const resultToSingleCall = {
      ConsumedCapacity: [],
      Responses: {
        tableName: [
          { key: 1 },
          { key: 2 },
        ],
      },
      UnprocessedKeys: {},
    };

    const dynamodb = mockDynamodb(resultToSingleCall);
    const params = generateTestParams(30);

    const result = await safeBatchGetItem(dynamodb, params);

    expect(result).toMatchSnapshot();
  });

  it('Combines correctly the result when over 100', async () => {
    const resultToSingleCall = {
      ConsumedCapacity: [],
      Responses: {
        tableName: [
          { key: 1 },
          { key: 2 },
        ],
      },
      UnprocessedKeys: {},
    };

    const dynamodb = mockDynamodb(resultToSingleCall);
    const params = generateTestParams(200);

    const result = await safeBatchGetItem(dynamodb, params);

    expect(result).toMatchSnapshot();
  });

  it('Works correctly with many tables when over 100', async () => {
    const dynamodb = mockDynamodb();
    let params = generateTestParams(200);
    params = addTableEntry(params, 'anotherTableName', generateTableEntry(150));

    await safeBatchGetItem(dynamodb, params);

    // Was split into 4 calls
    expect(allParams.length).toEqual(4);

    // Keys were split correctly
    expect(allParams).toMatchSnapshot();
  });

  it('Works correctly with many tables when under 100', async () => {
    const dynamodb = mockDynamodb();
    let params = generateTestParams(20);
    params = addTableEntry(params, 'anotherTableName', generateTableEntry(30));
    params = addTableEntry(params, 'anotherTableName1', generateTableEntry(40));

    await safeBatchGetItem(dynamodb, params);

    // Was NOT split into many calls
    expect(allParams.length).toEqual(1);

    // Keys were split correctly
    expect(allParams).toMatchSnapshot();
  });

  it('Combines many tables correctly when over 100', async () => {
    const dynamodb = mockDynamodb();
    let params = generateTestParams(20);
    params = addTableEntry(params, 'anotherTableName', generateTableEntry(70));
    params = addTableEntry(params, 'anotherTableName1', generateTableEntry(40));

    await safeBatchGetItem(dynamodb, params);

    // Results in 2 calls
    expect(allParams.length).toEqual(2);

    // Keys were split correctly
    expect(allParams).toMatchSnapshot();
  });
});
