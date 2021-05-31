const _ = require('lodash');

const safeBatchGetItem = require('../../src/utils/safeBatchGetItem');

const generateTestParams = (amountOfKeys) => (
  {
    RequestItems: {
      tableName: {
        AttributesToGet: ['attributeId'],
        ConsistentRead: true,
        ExpressionAttributeNames: {},
        Keys: _.range(amountOfKeys).map((index) => ({ key: index })),
        ProjectionExpression: 'projectionExpressionValue',
      },
    },
    ReturnConsumedCapacity: 'returnConsumedCapacityValue',
  }
);

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
});
