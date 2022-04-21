const BasicModel = require('./BasicModel');
const sqlClient = require('../../sql/sqlClient');

const tableNames = require('./tableNames');

const sampleFields = [
  'id',
  'experiment_id',
  'name',
  'sample_technology',
  'created_at',
  'updated_at',
];

class Sample extends BasicModel {
  constructor(sql = sqlClient.get()) {
    super(sql, tableNames.SAMPLE, sampleFields);
  }

  async getSamples(experimentId) {
    const samples = await this.find({ experiment_id: experimentId });
    console.log('SAMPLES ARE ', samples);

    return samples;
  }
}

// [
//   {
//     id: '0008e395-4386-41f4-aa75-247e03a2992f',
//     experimentId: 'd1416d5f-b7e2-c51e-0d94-80493cac56d4',
//     name: 'MR5_filtered_feature_bc_matrix',
//     sampleTechnology: '10x',
//     createdAt: '2021-10-22 20:43:12.471+00',
//     updatedAt: '2021-10-22 20:43:41.89+00'
//   },
//   {
//     id: 'acf76478-ee49-487f-9a03-e4fd89d6e108',
//     experimentId: 'd1416d5f-b7e2-c51e-0d94-80493cac56d4',
//     name: 'MR6_filtered_feature_bc_matrix',
//     sampleTechnology: '10x',
//     createdAt: '2021-10-22 20:43:12.482+00',
//     updatedAt: '2021-10-22 20:44:20.979+00'
//   }
// ]

module.exports = Sample;
