const generateBasicModelFunctions = require('../helpers/generateBasicModelFunctions');

const sampleTable = 'sample';
const sampleFields = [
  'id',
  'experiment_id',
  'name',
  'sample_technology',
  'created_at',
  'updated_at',
];

const basicModelFunctions = generateBasicModelFunctions({
  tableName: sampleTable,
  selectableProps: sampleFields,
});

module.exports = {
  ...basicModelFunctions,
};
