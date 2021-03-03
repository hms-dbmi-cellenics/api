
const fs = require('fs');
const path = require('path');
const SwaggerClient = require('swagger-client');
const Validator = require('swagger-model-validator');
const yaml = require('js-yaml');

const _ = require('lodash');

const validateRequest = async (request, schemaPath) => {
  const specPath = path.resolve(__dirname, '..', 'specs', 'models', schemaPath);

  // Create a custom Swagger client and 'HTTP fetcher' mock so we can load in
  // our spec spread across multiple local files. The result is the entire spec
  // fully resolved across all refs and imports.
  const { spec } = await SwaggerClient.resolve({
    url: specPath,
    http: async ({ url, headers }) => {
      const data = yaml.safeLoad(fs.readFileSync(url), 'utf8');

      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        url,
        headers,
        text: JSON.stringify(data),
        data: JSON.stringify(data),
        body: data,
        obj: data,
      };
    },
  });

  const validator = new Validator();
  const res = validator.validate(
    _.cloneDeep(request), _.cloneDeep(spec),
  );

  if (!res.valid) {
    throw new Error(res.errors[0]);
  }
};

module.exports = validateRequest;
