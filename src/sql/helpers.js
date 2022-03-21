const _ = require('lodash');

const jsonAggregate = (key, fields, pipelines, sql) => {
  const jsonObjectProps = fields.reduce((acum, current) => {
    const camelcasedField = _.camelCase(current);
    acum.push(`'${camelcasedField}'`);
    acum.push(current);

    return acum;
  }, []);

  const jsonBuildObject = `json_build_object(${jsonObjectProps.join(', ')})`;

  return sql.raw(`jsonb_object_agg(${key}, ${jsonBuildObject}) as ${pipelines}`);
};

const sqlToCamelCased = (snakeCasedFields) => snakeCasedFields.map((snakecased) => `${snakecased} as ${_.camelCase(snakecased)}`);

module.exports = { jsonAggregate, sqlToCamelCased };
