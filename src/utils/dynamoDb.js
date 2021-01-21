const AWS = require('aws-sdk');
const config = require('../config');

const createDynamoDbInstance = () => new AWS.DynamoDB({
  region: config.awsRegion,
});

const convertToDynamoDbRecord = (data) => AWS.DynamoDB.Converter.marshall(
  data, { convertEmptyValues: true },
);
const convertToJsObject = (data) => AWS.DynamoDB.Converter.unmarshall(data);


// Decompose array of [{ name : '', body: {} }, ...] to update expression elements
const configArrayToUpdateObjs = (key, configArr) => {
  const converted = configArr.reduce((acc, curr, idx) => ({
    updExpr: acc.updExpr.concat(`${key}.#key${idx + 1} = :val${idx + 1}, `),
    attrNames: {
      ...acc.attrNames,
      [`#key${idx + 1}`]: curr.name,
    },
    attrValues: {
      ...acc.attrValues,
      [`:val${idx + 1}`]: curr.body,
    },
  }), { updExpr: 'SET ', attrNames: {}, attrValues: {} });

  converted.attrValues = convertToDynamoDbRecord(converted.attrValues);

  // Remove trailing comma and space
  converted.updExpr = converted.updExpr.slice(0, -2);

  return converted;
};

module.exports = {
  createDynamoDbInstance, convertToDynamoDbRecord, convertToJsObject, configArrayToUpdateObjs,
};
