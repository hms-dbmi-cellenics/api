const collapseKeyIntoArray = (
  originalQuery,
  rootFields,
  collapseKey,
  collapsedKeyNewName,
  sql,
) => (
  sql
    .select([
      ...rootFields,
      sql.raw(`array_remove(array_agg("${collapseKey}"), NULL) as "${collapsedKeyNewName}"`),
    ])
    .from(originalQuery)
    .groupBy(rootFields)
);

const replaceNullsWithObject = (object, nullableKey) => (
  `COALESCE(
      ${object}
      FILTER(
        WHERE ${nullableKey} IS NOT NULL
      ),
      '{}'::jsonb
    )`
);

module.exports = { collapseKeyIntoArray, replaceNullsWithObject };
