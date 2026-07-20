// @ts-nocheck
const patchCellSetsObject = require('../../../../src/api.v2/helpers/s3/patchCellSetsObject');
const getObject = require('../../../../src/api.v2/helpers/s3/getObject');
const putObject = require('../../../../src/api.v2/helpers/s3/putObject');
const validateRequest = require('../../../../src/utils/schema-validator');

jest.mock('../../../../src/api.v2/helpers/s3/getObject');
jest.mock('../../../../src/api.v2/helpers/s3/putObject');
jest.mock('../../../../src/utils/schema-validator');

const mockExperimentId = 'mock-experiment-id';

const mockCellSets = JSON.stringify({
  cellSets: [
    {
      key: 'louvain',
      name: 'louvain clusters',
      rootNode: true,
      type: 'cellSets',
      children: [
        {
          key: 'louvain-0',
          name: 'Cluster 0',
          rootNode: false,
          type: 'cellSets',
          color: '#77aadd',
          cellIds: [0, 1, 2, 3],
        },
      ],
    },
    {
      key: 'CASSIA-Gut-Human-1',
      name: 'CASSIA',
      rootNode: true,
      type: 'cellSets',
      children: [],
    },
  ],
});

describe('patchCellSetsObject validation gating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getObject.mockReturnValue(mockCellSets);
  });

  it('skips validation when deleting a cell class', async () => {
    const deletePatch = [
      { $match: { query: '$[?(@.key == "CASSIA-Gut-Human-1")]', value: { $remove: true } } },
    ];

    await patchCellSetsObject(mockExperimentId, deletePatch);

    expect(validateRequest).not.toHaveBeenCalled();
    expect(putObject).toHaveBeenCalled();
  });

  it('skips validation when renaming a cell set', async () => {
    const renamePatch = [
      {
        $match: {
          query: '$[?(@.key == "louvain")]',
          value: {
            children: [
              { $match: { query: '$[?(@.key == "louvain-0")]', value: { name: 'Renamed' } } },
            ],
          },
        },
      },
    ];

    await patchCellSetsObject(mockExperimentId, renamePatch);

    expect(validateRequest).not.toHaveBeenCalled();
    expect(putObject).toHaveBeenCalled();
  });

  it('validates when the patch adds a cell set', async () => {
    const appendPatch = [
      {
        $append: {
          key: 'new-class', name: 'New', rootNode: true, type: 'cellSets', children: [],
        },
      },
    ];

    await patchCellSetsObject(mockExperimentId, appendPatch);

    expect(validateRequest).toHaveBeenCalledTimes(1);
  });
});
