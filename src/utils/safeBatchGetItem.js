const _ = require('lodash');

// DO NOT MODIFY, this value is specified in dynamodb docs
const maxKeys = 100;

const mergeIntoBatchKeysObject = (keys, tableName, batchKeysObject) => {
  const sumOfKeys = _.sumBy(Object.values(batchKeysObject), (obj) => obj.length);

  const spaceInRequest = maxKeys - sumOfKeys;

  // If the new keys fit in the current object then just return it with the new entry
  if (keys.length <= spaceInRequest) {
    return [{ ...batchKeysObject, [tableName]: keys }];
  }

  const firstKeys = keys.slice(0, spaceInRequest);
  const secondKeys = keys.slice(spaceInRequest);

  // Put as many keys as we can fit in old object
  const updatedBatchObj = {
    ...batchKeysObject,
    [tableName]: firstKeys,
  };

  // Create a new object for all the ones that we couldn't put
  const newBatchObj = { [tableName]: secondKeys };

  return [updatedBatchObj, newBatchObj];
};

const sendBatchGetItemRequest = (batchKeysObject, allParams, dynamodb) => {
  const keysObject = {};

  Object.entries(batchKeysObject).forEach(([tableName, keys]) => {
    const { Keys, ...restOfParams } = allParams.RequestItems[tableName];

    keysObject[tableName] = {
      ...restOfParams,
      Keys: keys,
    };
  });

  const params = {
    ...allParams,
    RequestItems: keysObject,
  };

  return dynamodb.batchGetItem(params).promise();
};

const concatIfArray = (objValue, srcValue) => {
  if (_.isArray(objValue) && _.isArray(srcValue)) {
    return [...objValue, ...srcValue];
  }

  return undefined;
};

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
  let batchGetKeys = [{}];

  // Fill up batchGetKeys with the keys for each table for each batchGet
  Object.entries(params.RequestItems).forEach(([tableName, { Keys: keys }]) => {
    const keyPartitions = _.chunk(keys, maxKeys);

    // Take out last element of keyPartitions (that might still have not reached 100)
    const lastKeyPartition = keyPartitions.pop();
    // Take out last element of batchGetKeys (that might still have not reached 100)
    const lastBatchGetObj = batchGetKeys.pop();

    // Combine these two objects into one if possible
    // (or into one with 100 and the other with the rest)
    const lastBatchKeysObjects = mergeIntoBatchKeysObject(
      lastKeyPartition,
      tableName,
      lastBatchGetObj,
    );

    // Convert all other keys that we know are groups of 100 into batchGetKeys objects
    const newBatchGets = keyPartitions.map((partition) => ({ [tableName]: partition }));

    // Concat all objects
    batchGetKeys = [...batchGetKeys, ...newBatchGets, ...lastBatchKeysObjects];
  });

  const requestPromises = batchGetKeys.map(
    (batchGetObject) => sendBatchGetItemRequest(batchGetObject, params, dynamodb),
  );

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
