const {
  createDynamoDbInstance,
  convertToJsObject,
  convertToDynamoDbRecord,
  manyConfigArraysToUpdateObjs,
} = require('../../utils/dynamoDb');

const { NotFoundError } = require('../../utils/responses');

const getExperimentAttributes = async (tableName, experimentId, attributes) => {
  const dynamodb = createDynamoDbInstance();
  const key = convertToDynamoDbRecord({ experimentId });

  const params = {
    TableName: tableName,
    Key: key,
  };

  if (Array.isArray(attributes) && attributes.length > 0) {
    params.ProjectionExpression = attributes.join();
  }

  const data = await dynamodb.getItem(params).promise();
  if (Object.keys(data).length === 0) {
    throw new NotFoundError('Experiment does not exist.');
  }

  const prettyData = convertToJsObject(data.Item);
  return prettyData;
};

const toUpdatePropertyArray = (updatePropertyObject) => (
  Object.entries(updatePropertyObject).map(([key, val]) => ({ name: key, body: val }))
);

const getDeepAttrsUpdateParameters = (body) => {
  const deepAttributesToUpdate = ['meta', 'processingConfig'].filter((key) => body[key]);

  const configUpdatesDictionary = {};
  deepAttributesToUpdate.forEach((key) => {
    configUpdatesDictionary[key] = toUpdatePropertyArray(body[key]);
  });


  return manyConfigArraysToUpdateObjs(deepAttributesToUpdate, configUpdatesDictionary);
};

const getShallowAttrsUpdateParameters = (body) => {
  const dataToUpdate = {
    experimentName: body.name || body.experimentName,
    apiVersion: body.apiVersion,
    createdAt: body.createdAt,
    lastViewed: body.lastViewed,
    projectId: body.projectUuid || body.projectId,
    description: body.description,
  };

  const objectToMarshall = {};
  const updateExprList = Object.entries(dataToUpdate).reduce(
    (acc, [key, val]) => {
      if (!val) {
        return acc;
      }

      const expressionKey = `:${key}`;
      objectToMarshall[expressionKey] = val;

      return [...acc, `${key} = ${expressionKey}`];
    }, [],
  );
  const attrValues = convertToDynamoDbRecord(objectToMarshall);

  return { updateExprList, attrValues };
};

module.exports = {
  getExperimentAttributes,
  toUpdatePropertyArray,
  getDeepAttrsUpdateParameters,
  getShallowAttrsUpdateParameters,
};
