const _ = require('lodash');
const validateRequest = require('../../../src/utils/validateRequest');

describe('Schema validator', () => {
  it('Validates the DotPlot work request correctly', async () => {
    const schemaPath = '../../specs/models/work-request-bodies/WorkRequestDotPlot.v1.yaml';

    const validBody = {
      name: 'DotPlot',
      useMarkerGenes: false,
      numberOfMarkers: 3,
      customGenesList: [
        'Lyz2',
        'Chil3',
        'Gzma',
      ],
      groupBy: 'louvain',
      filterBy: {
        group: 'All',
        key: null,
      },
    };

    // It should validate correctly with the correct body
    // ValidateRequest does not return anything, so we're expecting undefined
    await expect(validateRequest(validBody, schemaPath)).resolves.toBeUndefined();

    // It has to contain the correct name
    const wrongName = _.merge({}, validBody, { name: 'WrongName ' });
    await expect(validateRequest(wrongName, schemaPath)).rejects.toThrow();

    // It has to contain useMarkerGenes
    const noMarkerGenes = _.cloneDeep(validBody);
    delete noMarkerGenes.useMarkerGenes;
    await expect(validateRequest(noMarkerGenes, schemaPath)).rejects.toThrow();

    // Input has to contain numberOfMarkers
    const noNumberOfMarkers = _.cloneDeep(validBody);
    delete noNumberOfMarkers.numberOfMarkers;
    await expect(validateRequest(noNumberOfMarkers, schemaPath)).rejects.toThrow();

    // Input has to contain genes
    const noCustomGenesList = _.cloneDeep(validBody);
    delete noCustomGenesList.customGenesList;
    await expect(validateRequest(noCustomGenesList, schemaPath)).rejects.toThrow();

    // It has to contain groupBy
    const noGroupBy = _.cloneDeep(validBody);
    delete noGroupBy.groupBy;
    await expect(validateRequest(noGroupBy, schemaPath)).rejects.toThrow();

    // It has to contain filterBy
    const noFilterBy = _.cloneDeep(validBody);
    delete noFilterBy.filterBy;
    await expect(validateRequest(noFilterBy, schemaPath)).rejects.toThrow();

    // subset has to contain group
    const noFilterByGroup = _.cloneDeep(validBody);
    delete noFilterByGroup.filterBy.group;
    await expect(validateRequest(noFilterByGroup, schemaPath)).rejects.toThrow();

    // filterBy does not have to contain key
    // This is not required because null not pass validation
    const noFilterByKey = _.cloneDeep(validBody);
    delete noFilterByKey.filterBy.key;
    await expect(validateRequest(noFilterByKey, schemaPath)).resolves.toBeUndefined();
  });
});
