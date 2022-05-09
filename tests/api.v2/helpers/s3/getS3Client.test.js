const getS3Client = require('../../../../src/api.v2/helpers/s3/getS3Client');
const AWS = require('../../../../src/utils/requireAWS');

jest.mock('../../../../src/utils/requireAWS', () => ({
  S3: jest.fn((params) => ({ ...params })),
}));

describe('getS3Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Returns an S3 client with defau lt config values if not given any params', () => {
    const s3Client = getS3Client();

    expect(AWS.S3).toHaveBeenCalledTimes(1);

    const configParams = AWS.S3.mock.calls[0][0];

    expect(configParams).toMatchSnapshot();
    expect(s3Client).not.toBeUndefined();
  });

  it('Takes in params and return S3 client with those params', () => {
    const additionalParams = {
      region: 'us-east-1',
      endpointUrl: 'https://s3.biomage-cloud.com',
    };

    const s3Client = getS3Client(additionalParams);

    expect(AWS.S3).toHaveBeenCalledTimes(1);

    const configParams = AWS.S3.mock.calls[0][0];

    expect(configParams).toMatchSnapshot();
    expect(s3Client).not.toBeUndefined();
  });
});
