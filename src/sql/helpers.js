const createCollapsedObject = (collapseKey, nestedFields, collapseKeyNewName, sql) => {
  const jsonObjectProps = nestedFields.reduce((acum, current) => {
    acum.push(`'${current}'`);
    acum.push(current);

    return acum;
  }, []);

  // Specify which properties from the rows we want in each value in the aggregated object
  const jsonBuildObjectSql = `json_build_object(${jsonObjectProps.join(', ')})`;

  // Set column {key} as the key for each value
  const jsonbObjectAggSql = `jsonb_object_agg(${collapseKey}, ${jsonBuildObjectSql})`;

  // When there is no row to aggregate, json_object_agg throws an error
  // So we need to handle this case outside jsonb_object_agg with coalesce
  // Solution based on https://stackoverflow.com/a/33305456
  const handleNoExecutionsFoundSql = (
    `COALESCE(${jsonbObjectAggSql}
      FILTER(
        WHERE ${collapseKey} IS NOT NULL
      ),
      '{}'::jsonb
    )`
  );

  return sql.raw(`${handleNoExecutionsFoundSql} as ${collapseKeyNewName}`);
};

/**
 *
 * @param {*} originalQuery Query that fetches the sql data
 * @param {*} rootFields Fields that shouldn't be aggregated
 * @param {*} fieldsToCollapse Fields that vary across each aggregationColumnName,
 * this is what we want to aggregate into one object for each aggregationColumnName
 * @param {*} collapseKey The column by which we want to perform the aggregation,
 * the object will contain one key for each aggregationColumnName value
 * @param {*} collapseKeyNewName The key that we want to be added holding all the aggregated data
 * @param {*} sql The sql client to use
 * @returns An object with all the data that can be aggregated squashed together, for example,
 * If our originalQuery returns two rows:
 * [
 *  { id: '123', name: 'myExp', pipeline_type: gem2s, pipeline_arn: 5555, hash: 123 },
 *  { id: '123', name: 'myExp', pipeline_type: qc, pipeline_arn: 6666, hash: 321 }
 * ]
 *
 * We can use this function to return instead:
 * [
 *  {
 *    id: '123',
 *    name: 'myExp',
 *    pipelines: {
 *      gem2s: {
 *        pipelineArn: 5555,
 *        hash: 123
 *      },
 *      qc: {
 *        pipelineArn: 6666,
 *        hash: 321
 *      }
 *    }
 *  }
 * ]
 * For this example:
 * - rootFields: ['id', 'name'],
 * - nestedFields: ['pipeline_arn', 'hash]
 * - collapseKey: 'pipeline_type'
 * - collapseKeyNewName: 'pipelines'
 *
 * Note it also camelcases all the keys returned
 */
const collapseKeysIntoObject = (
  originalQuery,
  rootFields,
  fieldsToCollapse,
  collapseKey,
  collapseKeyNewName,
  sql,
) => (
  sql
    .select([
      ...rootFields,
      createCollapsedObject(collapseKey, fieldsToCollapse, collapseKeyNewName, sql),
    ])
    .from(originalQuery)
    .groupBy(rootFields)
);

const collapseKeyIntoArray = (
  originalQuery,
  rootFields,
  originalKeyName,
  collapsedKeyName,
  sql,
) => (
  sql
    .select([
      ...rootFields,
      sql.raw(`array_remove(array_agg("${originalKeyName}"), NULL) as "${collapsedKeyName}"`),
    ])
    .from(originalQuery)
    .groupBy(rootFields)
);

module.exports = {
  collapseKeysIntoObject, collapseKeyIntoArray,
};
