const _ = require('lodash');

const sqlToCamelCased = (snakeCasedFields) => snakeCasedFields.map((snakecased) => `${snakecased} as ${_.camelCase(snakecased)}`);

const jsonbObjectAgg = (aggregationColumnKey, nestedFields, aggregationJsonKey, sql) => {
  const jsonObjectProps = nestedFields.reduce((acum, current) => {
    const camelcasedField = _.camelCase(current);
    acum.push(`'${camelcasedField}'`);
    acum.push(current);

    return acum;
  }, []);

  // Specify which properties from the rows we want in each value in the aggregated object
  const jsonBuildObjectSql = `json_build_object(${jsonObjectProps.join(', ')})`;

  // Set column {key} as the key for each value
  const jsonbObjectAggSql = `jsonb_object_agg(${aggregationColumnKey}, ${jsonBuildObjectSql})`;

  // When there is no row to aggregate, json_object_agg throws an error
  // So we need to handle this case outside jsonb_object_agg with coalesce
  // Solution based on https://stackoverflow.com/a/33305456
  const handleNoExecutionsFoundSql = `
  COALESCE(${jsonbObjectAggSql}
    FILTER(
      WHERE ${aggregationColumnKey} IS NOT NULL
    ),
    '{}'::jsonb
  ) 
  `;

  return sql.raw(`${handleNoExecutionsFoundSql} as ${aggregationJsonKey}`);
};

/**
 *
 * @param {*} originalQuery Query that fetches the sql data
 * @param {*} rootFields Fields that shouldn't be aggregated
 * @param {*} nestedFields Fields that vary across each aggregationColumnName,
 * this is what we want to aggregate into one object for each aggregationColumnName
 * @param {*} aggregationColumnKey The column by which we want to perform the aggregation,
 * the object will contain one key for each aggregationColumnName value
 * @param {*} aggregationJsonKey The key that we want to be added holding all the aggregated data
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
 * - aggregationColumnKey: 'pipeline_type'
 * - aggregationJsonKey: 'pipelines'
 *
 * Note it also camelcases all the keys returned
 */
const aggregateIntoJson = async (
  originalQuery,
  rootFields,
  nestedFields,
  aggregationColumnKey,
  aggregationJsonKey,
  sql,
) => (
  await sql
    .select([
      ...sqlToCamelCased(rootFields),
      jsonbObjectAgg(aggregationColumnKey, nestedFields, aggregationJsonKey, sql),
    ])
    .from(originalQuery)
    .groupBy(rootFields)
);

module.exports = { aggregateIntoJson, sqlToCamelCased };
