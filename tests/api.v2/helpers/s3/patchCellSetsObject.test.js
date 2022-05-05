// @ts-nocheck
const patchCellSetsObject = require('../../../../src/api.v2/helpers/s3/patchCellSetsObject');
const getObject = require('../../../../src/api.v2/helpers/s3/getObject');
const putObject = require('../../../../src/api.v2/helpers/s3/putObject');

jest.mock('../../../../src/api.v2/helpers/s3/getObject');
jest.mock('../../../../src/api.v2/helpers/s3/putObject');

const mockExperimentId = 'mock-experiment-id';

const mockCellSets = {
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
  ],
};

const mockPatch = [
  {
    $match: {
      query: '$[?(@.key == "scratchpad")]',
      value: {
        children: [
          {
            $insert:
              {
                index: '-',
                value:
                  {
                    key: 'new-cluster-1',
                    name: 'New Cluster 1',
                    color: '#3957ff',
                    type: 'cellSets',
                    cellIds: [4, 5, 6],
                  },
              },
          },
        ],
      },
    },
  },
];

describe('patchCellSetsObject', () => {
  it('Works correctly', async () => {
    getObject.mockReturnValueOnce(mockCellSets);

    const result = await patchCellSetsObject(mockExperimentId, mockPatch);

    // Put a modified object
    const putParams = putObject.mock.calls[0][0];

    expect(putParams).toMatchSnapshot();

    // Does not return anything on success
    expect(result).toBeUndefined();
  });
});
