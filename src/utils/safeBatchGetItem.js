const _ = require('lodash');

const concatIfArray = (objValue, srcValue) => {
  if (_.isArray(objValue) && _.isArray(srcValue)) {
    return [...objValue, ...srcValue];
  }

  return undefined;
};

// DO NOT MODIFY, this value is specified in dynamodb docs
const maxKeys = 100;

/**
 * A wrapper for dynamodb's batchGetItem
 * This wrapper handles requests of more than 100 items at the same time
 *  by splitting them into separate batchGetItems
 *
 * @param {*} dynamodb dynamodb sdk client
 * @param {*} params params as would be passed to batchGetItem
 * @returns The result as would be returned by batchGetItem
 */
const safeBatchGetItem = async (dynamodb, params) => {
  const tableNames = [];
  const chunkedKeysByTableName = {};

  let amountOfRequests = 0;

  // For each table, separate keys into subarrays of the maximum size possible each (100 keys)
  // example: chunkedKeysByTableName[tableName] = [[first 100 keys],[second 100 keys]]
  Object.entries(params.RequestItems).forEach(([tableName, { Keys: keys }]) => {
    tableNames.push(tableName);
    chunkedKeysByTableName[tableName] = _.chunk(keys, maxKeys);

    amountOfRequests = Math.max(chunkedKeysByTableName[tableName].length, amountOfRequests);
  });

  // Execute one request for each number in amountOfRequests
  // (this is equivalent to using a traditional for)
  const requestPromises = _.range(amountOfRequests).map(async (partitionIndex) => {
    const currentKeys = {};

    tableNames.forEach((tableName) => {
      const keysForTable = chunkedKeysByTableName[tableName][partitionIndex];

      const { Keys, ...restOfParams } = params.RequestItems[tableName];

      if (keysForTable) {
        currentKeys[tableName] = {
          ...restOfParams,
          Keys: keysForTable,
        };
      }
    });

    const chunkParams = {
      ...params,
      RequestItems: currentKeys,
    };

    return dynamodb.batchGetItem(chunkParams).promise();
  });

  // Wait for all batchGetItems to resolve
  const getResults = await Promise.all(requestPromises);

  // Merge all results into one
  const flattenedResult = getResults.reduce((acc, curr) => {
    _.mergeWith(acc, curr, concatIfArray);
    return acc;
  }, {});

  return flattenedResult;
};

module.exports = safeBatchGetItem;
