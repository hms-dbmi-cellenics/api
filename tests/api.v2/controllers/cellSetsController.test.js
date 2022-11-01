// @ts-nocheck
const cellSetsController = require('../../../src/api.v2/controllers/cellSetsController');
const bucketNames = require('../../../src/config/bucketNames');

const getS3Object = require('../../../src/api.v2/helpers/s3/getObject');
const patchCellSetsObject = require('../../../src/api.v2/helpers/s3/patchCellSetsObject');
const { OK } = require('../../../src/utils/responses');

jest.mock('../../../src/api.v2/helpers/s3/getObject');
jest.mock('../../../src/api.v2/helpers/s3/patchCellSetsObject');

const mockRes = {
  json: jest.fn(),
  send: jest.fn(),
};

const mockCellSets = {
  cellSets:
    [
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

const mockExperimentId = '1234-5678-9012';

describe('cellSetsController', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
  });

  it('getCellSets works correctly', async () => {
    const mockReq = { params: { experimentId: mockExperimentId } };
    getS3Object.mockImplementationOnce(
      () => Promise.resolve(mockCellSets),
    );

    await cellSetsController.getCellSets(mockReq, mockRes);

    expect(getS3Object).toHaveBeenCalledWith({
      Bucket: bucketNames.CELL_SETS,
      Key: mockExperimentId,
    });

    expect(mockRes.send).toHaveBeenCalledWith(mockCellSets);
  });

  it('patchCellSetsObject works correctly', async () => {
    const mockReq = {
      params: { experimentId: mockExperimentId },
      body: mockPatch,
    };

    patchCellSetsObject.mockImplementationOnce(
      () => Promise.resolve(null),
    );

    await cellSetsController.patchCellSets(mockReq, mockRes);

    expect(patchCellSetsObject).toHaveBeenCalledWith(
      mockExperimentId,
      mockPatch,
    );

    expect(mockRes.json).toHaveBeenCalledWith(OK());
  });
});
