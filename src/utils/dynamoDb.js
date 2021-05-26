const _ = require('lodash');
const AWS = require('./requireAWS');

const config = require('../config');

const createDynamoDbInstance = () => new AWS.DynamoDB({
  region: config.awsRegion,
});

const convertToDynamoDbRecord = (data) => AWS.DynamoDB.Converter.marshall(
  data, { convertEmptyValues: false },
);

const convertToJsObject = (data) => AWS.DynamoDB.Converter.unmarshall(data);

// Decompose array of [{ name : '', body: {} }, ...] to update expression elements
const configArrayToUpdateObjs = (key, configArr, baseIndex = 0) => {
  const converted = configArr.reduce((acc, curr, idx) => ({
    updExpr: acc.updExpr.concat(`${key}.#key${idx + 1 + baseIndex} = :val${idx + 1 + baseIndex}, `),
    attrNames: {
      ...acc.attrNames,
      [`#key${idx + 1 + baseIndex}`]: curr.name,
    },
    attrValues: {
      ...acc.attrValues,
      [`:val${idx + 1 + baseIndex}`]: curr.body,
    },
  }), { updExpr: 'SET ', attrNames: {}, attrValues: {} });

  converted.attrValues = convertToDynamoDbRecord(converted.attrValues);

  // Remove trailing comma and space
  converted.updExpr = converted.updExpr.slice(0, -2);

  return converted;
};

const manyConfigArraysToUpdateObjs = (keys, configArrayDict) => {
  const updateExpressionList = [];
  let attributeNames = {};
  let attributeValues = {};

  let indexOffset = 0;

  keys.forEach((key) => {
    const configArray = configArrayDict[key];

    const {
      updExpr,
      attrNames,
      attrValues,
    } = configArrayToUpdateObjs(key, configArray, indexOffset);

    updateExpressionList.push(_.trimStart(updExpr, 'SET'));
    attributeNames = _.merge(attributeNames, attrNames);
    attributeValues = _.merge(attributeValues, attrValues);

    indexOffset += configArray.length;
  });

  return { updateExpressionList, attributeNames, attributeValues };
};

module.exports = {
  createDynamoDbInstance,
  convertToDynamoDbRecord,
  convertToJsObject,
  configArrayToUpdateObjs,
  manyConfigArraysToUpdateObjs,
};
