const _ = require('lodash');
const validateRequest = require('../../../src/utils/schema-validator');

describe('Schema validator', () => {
  const schemaPath = '../../specs/models/work-request-bodies/WorkRequestCASSIA.v2.yaml';

  const validBody = {
    name: 'CASSIAAnnotate',
    species: 'Human',
    tissue: 'Large Intestine',
    additionalInfo: '3 colorectal tumor and 2 normal adjacent tissue samples',
  };

  it('Validates a complete CASSIA work request', async () => {
    await expect(validateRequest(validBody, schemaPath)).resolves.toBeUndefined();
  });

  it('Accepts a request without the optional additionalInfo', async () => {
    const noAdditionalInfo = _.cloneDeep(validBody);
    delete noAdditionalInfo.additionalInfo;
    await expect(validateRequest(noAdditionalInfo, schemaPath)).resolves.toBeUndefined();
  });

  it('Rejects the wrong task name', async () => {
    const wrongName = _.merge({}, validBody, { name: 'WrongName' });
    await expect(validateRequest(wrongName, schemaPath)).rejects.toThrow();
  });

  it('Requires species', async () => {
    const noSpecies = _.cloneDeep(validBody);
    delete noSpecies.species;
    await expect(validateRequest(noSpecies, schemaPath)).rejects.toThrow();
  });

  it('Requires tissue', async () => {
    const noTissue = _.cloneDeep(validBody);
    delete noTissue.tissue;
    await expect(validateRequest(noTissue, schemaPath)).rejects.toThrow();
  });
});
