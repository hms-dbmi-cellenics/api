// @ts-nocheck
const _ = require('lodash');

const { mockSqlClient, mockTrx } = require('../mocks/getMockSqlClient')();

const Sample = require('../../../src/api.v2/model/Sample');

const getSamplesResponse = require('../mocks/data/getSamplesResponse.json');

const mockExperimentId = 'mockExperimentId';
// @ts-nocheck
// Disabled ts because it doesn't recognize jest mocks
const tableNames = require('../../../src/api.v2/model/tableNames');

jest.mock('../../../src/sql/sqlClient', () => ({
  get: jest.fn(() => mockSqlClient),
}));

jest.mock('../../../src/sql/helpers', () => ({
  collapseKeysIntoObject: jest.fn(),
  collapseKeyIntoArray: jest.fn(),
  replaceNullsWithObject: jest.requireActual('../../../src/sql/helpers').replaceNullsWithObject,
}));

const mockSampleId = 'mockSampleId';
const mockSampleFileId = 'sampleFileId';
const mockSampleFileType = 'features10x';


describe('model/Sample', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Get samples works correctly', async () => {
    await new Sample().getSamples(mockExperimentId).toString();
    expect(mockSqlClient.where.mock.calls).toMatchSnapshot();
    expect(mockSqlClient.from.mock.calls).toMatchSnapshot();
    expect(mockSqlClient.select.mock.calls).toMatchSnapshot();
    expect(mockSqlClient.join.mock.calls).toMatchSnapshot();
    expect(mockSqlClient.groupBy.mock.calls).toMatchSnapshot();
    expect(mockSqlClient.raw.mock.calls).toMatchSnapshot();
    expect(mockSqlClient.leftJoin.mock.calls).toMatchSnapshot();
  });

  it('setNewFile works correctly if valid params are passed', async () => {
    mockTrx.ref.mockImplementationOnce(() => 'sf_mapsample_file_idRef');

    await new Sample().setNewFile(mockSampleId, mockSampleFileId, mockSampleFileType);

    expect(mockTrx).toHaveBeenCalledWith(tableNames.SAMPLE_TO_SAMPLE_FILE_MAP);

    // Test delete from SAMPLE_TO_SAMPLE_FILE_MAP query
    expect(mockTrx.from).toHaveBeenCalledWith({ sf_map: tableNames.SAMPLE_TO_SAMPLE_FILE_MAP });
    expect(mockTrx.where).toHaveBeenCalledWith({ sample_id: mockSampleId });
    expect(mockTrx.andWhere).toHaveBeenCalledWith('sample_file_id', '=', expect.anything());

    expect(mockTrx.select).toHaveBeenCalledWith(['id']);
    expect(mockTrx.from).toHaveBeenCalledWith({ sf: tableNames.SAMPLE_FILE });
    expect(mockTrx.where).toHaveBeenCalledWith('sf.id', '=', 'sf_mapsample_file_idRef');
    expect(mockTrx.andWhere).toHaveBeenCalledWith('sf.sample_file_type', '=', mockSampleFileType);

    // Test add new sample file reference
    expect(mockTrx).toHaveBeenCalledWith(tableNames.SAMPLE_TO_SAMPLE_FILE_MAP);
    expect(mockTrx.insert).toHaveBeenCalledWith({
      sample_id: mockSampleId,
      sample_file_id: mockSampleFileId,
    });
  });

  it('copyTo works correctly', async () => {
    const fromExperimentId = 'fromExperimentIdMock';
    const toExperimentId = 'toExperimentIdMock';
    const samplesOrder = Object.values(getSamplesResponse).map((sample) => sample.id);

    mockTrx.returning.mockImplementationOnce(() => Promise.resolve([{ id: 0, key: 'Track0' }]));

    const getSamplesSpy = jest.spyOn(Sample.prototype, 'getSamples')
      .mockImplementationOnce(() => Promise.resolve(getSamplesResponse));


    await new Sample().copyTo(fromExperimentId, toExperimentId, samplesOrder);


    expect(getSamplesSpy).toHaveBeenCalledWith(fromExperimentId);

    expect(mockTrx).toHaveBeenCalledWith(tableNames.METADATA_TRACK);
    expect(mockTrx).toHaveBeenCalledWith(tableNames.SAMPLE);
    expect(mockTrx).toHaveBeenCalledWith(tableNames.SAMPLE_IN_METADATA_TRACK_MAP);
    expect(mockTrx).toHaveBeenCalledWith(tableNames.SAMPLE_TO_SAMPLE_FILE_MAP);

    expect(mockTrx.insert.mock.calls).toMatchSnapshot();
    expect(mockTrx.returning.mock.calls).toMatchSnapshot();
  });

  it('copyTo works correctly if experiment has no metadata tracks', async () => {
    const fromExperimentId = 'fromExperimentIdMock';
    const toExperimentId = 'toExperimentIdMock';

    const noMetadataGetSamplesResponse = _.cloneDeep(getSamplesResponse);
    noMetadataGetSamplesResponse.forEach((sample) => {
      // eslint-disable-next-line no-param-reassign
      sample.metadata = {};
    });

    const samplesOrder = Object.values(noMetadataGetSamplesResponse).map((sample) => sample.id);

    mockTrx.returning.mockImplementationOnce(() => Promise.resolve([{ id: 0, key: 'Track0' }]));

    const getSamplesSpy = jest.spyOn(Sample.prototype, 'getSamples')
      .mockImplementationOnce(() => Promise.resolve(noMetadataGetSamplesResponse));


    await new Sample().copyTo(fromExperimentId, toExperimentId, samplesOrder);


    expect(getSamplesSpy).toHaveBeenCalledWith(fromExperimentId);

    expect(mockTrx).toHaveBeenCalledWith(tableNames.SAMPLE);
    expect(mockTrx).toHaveBeenCalledWith(tableNames.SAMPLE_TO_SAMPLE_FILE_MAP);
    expect(mockTrx).not.toHaveBeenCalledWith(tableNames.METADATA_TRACK);
    expect(mockTrx).not.toHaveBeenCalledWith(tableNames.SAMPLE_IN_METADATA_TRACK_MAP);

    expect(mockTrx.insert.mock.calls).toMatchSnapshot();
    expect(mockTrx.returning.mock.calls).toMatchSnapshot();
  });

  it('copyTo works correctly if experiment has no samples', async () => {
    const fromExperimentId = 'fromExperimentIdMock';
    const toExperimentId = 'toExperimentIdMock';

    const samplesOrder = [];

    const copiedSamplesOrder = await new Sample().copyTo(
      fromExperimentId, toExperimentId, samplesOrder,
    );

    expect(copiedSamplesOrder).toHaveLength(0);

    expect(mockTrx).not.toHaveBeenCalledWith(tableNames.SAMPLE);
    expect(mockTrx).not.toHaveBeenCalledWith(tableNames.SAMPLE_TO_SAMPLE_FILE_MAP);
    expect(mockTrx).not.toHaveBeenCalledWith(tableNames.METADATA_TRACK);
    expect(mockTrx).not.toHaveBeenCalledWith(tableNames.SAMPLE_IN_METADATA_TRACK_MAP);
  });

  it('updateOption works correctly', async () => {
    const mockOptions = { someOption: true, otherOption: false };
    const JSONBString = `'${JSON.stringify(mockOptions)}'::jsonb`;

    mockSqlClient.raw.mockImplementationOnce((x) => x);

    await new Sample().updateOption(mockExperimentId, mockOptions);

    expect(mockSqlClient.update());

    expect(mockSqlClient.raw.mock.calls[0][0]).toEqual(JSONBString);
    expect(mockSqlClient.update.mock.calls[0][0]).toEqual({ options: JSONBString });
    expect(mockSqlClient.where.mock.calls[0][0]).toEqual({ experiment_id: mockExperimentId });
  });
});
