// Updates each sub attribute separately for
// one particular attribute (of type object) of a dynamodb entry

const { NotFoundError } = require('../../utils/responses');

const removePropertiesFromObject = async (
  entryKey, attributeName, propertyToRemove,
  tableName, dynamodb,
) => {
  const params = {
    TableName: tableName,
    Key: entryKey,
    UpdateExpression: `REMOVE ${attributeName}.${propertyToRemove}`,
    ReturnValues: 'ALL_NEW',
  };

  await dynamodb.updateItem(params).promise();
};

const undefinedIfNotFound = async (promise) => {
  try {
    return await promise;
  } catch (e) {
    if (e instanceof NotFoundError) {
      return undefined;
    }

    throw e;
  }
};

module.exports = { removePropertiesFromObject, undefinedIfNotFound };
