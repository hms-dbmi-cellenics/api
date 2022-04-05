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

module.exports = { collapseKeyIntoArray };
