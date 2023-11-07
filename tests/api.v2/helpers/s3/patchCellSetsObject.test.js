// @ts-nocheck
const patchCellSetsObject = require('../../../../src/api.v2/helpers/s3/patchCellSetsObject');
const getObject = require('../../../../src/api.v2/helpers/s3/getObject');
const putObject = require('../../../../src/api.v2/helpers/s3/putObject');

jest.mock('../../../../src/api.v2/helpers/s3/getObject');
jest.mock('../../../../src/api.v2/helpers/s3/putObject');

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
  ],
});

const mockPatch = [
  {
    $match: {
      query: '$[?(@.key == "louvain")]',
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
                    rootNode: false,
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
  beforeEach(() => {
    jest.resetAllMocks(); // This resets the state of all mocks
  });


  it('Works correctly', async () => {
    getObject.mockReturnValue(mockCellSets);

    const result = await patchCellSetsObject(mockExperimentId, mockPatch);

    // Put a modified object
    const putParams = putObject.mock.calls[0][0];

    expect(putParams).toMatchSnapshot();

    // Does not return anything on success
    expect(result).toBeUndefined();
  });

  it('Throws an error if the JSON merger result is not correct', async () => {
    // Should fail validation because cellIds is not an array
    const malformedPatch = [
      {
        $match: {
          query: '$[?(@.key == "louvain")]',
          value: {
            children: [
              {
                $insert:
              {
                index: '-',
                value:
                  {
                    key: 'singular-cluster',
                    name: 'Singular cluster',
                    rootNode: false,
                    color: '#3957ff',
                    type: 'cellSets',
                    cellIds: 1,
                  },
              },
              },
            ],
          },
        },
      },
    ];

    await expect(patchCellSetsObject(mockExperimentId, malformedPatch)).rejects.toThrow();
  });

  it('Patch with CLM elements replaces old CLM cell sets', async () => {
    // Mock cellSets with CLM types
    const mockCellSetsWithCLM = JSON.stringify({
      cellSets: [
        {
          key: 'sample1',
          name: 'To remove 1',
          type: 'CLM',
          children: [],
        },
        // This should stay since it's not CLM type
        {
          key: 'sample2',
          name: 'Sample 2',
          type: 'notCLM',
          children: [],
        },
        {
          key: 'sample3',
          name: 'To Remove 2',
          type: 'CLMPerSample',
          children: [],
        },
      ],
    });

    const mockPatchThatContainsCLM = [
      {
        $append: {
          key: 'New',
          name: 'New CLM',
          type: 'CLM',
          children: [],
        },
      },
    ];

    getObject.mockReturnValueOnce(mockCellSetsWithCLM);

    await patchCellSetsObject(mockExperimentId, mockPatchThatContainsCLM);

    // Put a modified object without CLM types
    const putParams = putObject.mock.calls[0][0];
    const modifiedCellSets = JSON.parse(putParams.Body).cellSets;

    // Check that the elements with CLM types have been removed
    expect(modifiedCellSets).toMatchSnapshot();
  });
});
