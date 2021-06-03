// Updates each sub attribute separately for
// one particular attribute (of type object) of a dynamodb entry

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

module.exports = { removePropertiesFromObject };
