const _ = require('lodash');
const validateRequest = require('../../../src/utils/schema-validator');

describe('Schema validator', () => {
  it('Validates the DotPlot work request correctly', async () => {
    const schemaPath = '../../specs/models/work-request-bodies/WorkRequestDotPlot.v1.yaml';

    const validBody = {
      name: 'DotPlot',
      markerGenes: true,
      input: {
        nGenes: 5,
        genes: ['Gzma', 'Lyz2'],
      },
      subset: {
        cellClassKey: 'louvain',
        cellSetKey: 'All',
      },
    };

    // It should validate correctly with the correct body
    const validationResult = await validateRequest(validBody, schemaPath);

    // ValidateRequest does not return anything, so we're expecting undefined
    expect(validationResult).toBeUndefined();

    // It has to contain the correct name
    const wrongName = _.merge(validBody, { name: 'WrongName ' });
    await expect(validateRequest(wrongName, schemaPath)).rejects.toThrow();

    // It has to contain markerGenes
    const noMarkerGenes = _.clone(validBody);
    delete noMarkerGenes.markerGenes;
    await expect(validateRequest(noMarkerGenes, schemaPath)).rejects.toThrow();

    // It has to contain input
    const noInput = _.clone(validBody);
    delete noInput.input;
    await expect(validateRequest(noInput, schemaPath)).rejects.toThrow();

    // Input has to contain nGenes
    const noInputNGenes = _.clone(validBody);
    delete noInputNGenes.subset.nGenes;
    await expect(validateRequest(noInputNGenes, schemaPath)).rejects.toThrow();

    // Input has to contain genes
    const noInputGenes = _.clone(validBody);
    delete noInputGenes.subset.genes;
    await expect(validateRequest(noInputGenes, schemaPath)).rejects.toThrow();

    // It has to contain subset
    const noSubset = _.clone(validBody);
    delete noSubset.subset;
    await expect(validateRequest(noSubset, schemaPath)).rejects.toThrow();

    // subset has to contain cellClassKey
    const noSubsetCellClassKey = _.clone(validBody);
    delete noSubsetCellClassKey.subset;
    await expect(validateRequest(noSubsetCellClassKey, schemaPath)).rejects.toThrow();

    // subset has to contain cellSetKey
    const noSubsetCellSetKey = _.clone(validBody);
    delete noSubsetCellSetKey.subset;
    await expect(validateRequest(noSubsetCellSetKey, schemaPath)).resolves.toEqual(undefined);
  });
});
