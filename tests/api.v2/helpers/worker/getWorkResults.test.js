const AWSMock = require('aws-sdk-mock');
const { UnauthorizedError, NotFoundError, InternalServerError } = require('../../../../src/utils/responses');
const getWorkResults = require('../../../../src/api.v2/helpers/worker/getWorkResults');
const { mockS3GetObjectTagging, mockS3GetSignedUrl } = require('../../../test-utils/mockAWSServices');
const fake = require('../../../test-utils/constants');
const config = require('../../../../src/config');

const tags = { TagSet: [{ Key: 'experimentId', Value: fake.EXPERIMENT_ID }, { Key: 'otherTag', Value: 'mockOtherTag' }] };

describe('getWorkResults', () => {
  beforeEach(() => {
    AWSMock.restore();
    jest.clearAllMocks();
  });

  it('Correct experiment Id should get a signed url', async () => {
    const s3Spy = mockS3GetObjectTagging(tags);
    const signedUrlSpy = mockS3GetSignedUrl();

    await getWorkResults(fake.EXPERIMENT_ID, 'mockETag');
    expect(s3Spy).toHaveBeenCalled();
    expect(signedUrlSpy).toHaveBeenCalledWith('getObject', { Bucket: `worker-results-test-${config.awsAccountId}`, Key: 'mockETag' });
  });

  it('Non-existent key throws a NotFoundError', async () => {
    mockS3GetObjectTagging(undefined, { code: 'NoSuchKey' });
    const signedUrlSpy = mockS3GetSignedUrl();
    const experimentId = 'someOtherExpIdasdasd';
    await expect(
      getWorkResults(experimentId, 'mockETag'),
    ).rejects.toThrow(NotFoundError);

    expect(signedUrlSpy).not.toHaveBeenCalled();
  });

  it('Unexpected errors throw a NotFound', async () => {
    const customError = Error('custom');
    mockS3GetObjectTagging(undefined, customError);
    const signedUrlSpy = mockS3GetSignedUrl();
    const experimentId = 'someOtherExpIdasdasd';
    await expect(
      getWorkResults(experimentId, 'mockETag'),
    ).rejects.toThrow(NotFoundError);

    expect(signedUrlSpy).not.toHaveBeenCalled();
  });

  it('Incorrect experiment ID does not get a signed URL', async () => {
    mockS3GetObjectTagging(tags);
    const signedUrlSpy = mockS3GetSignedUrl();
    const experimentId = 'someOtherExpIdasdasd';
    await expect(
      getWorkResults(experimentId, 'mockETag'),
    ).rejects.toThrow(new UnauthorizedError('User was authorized for experiment someOtherExpIdasdasd but the requested '
      + `worker results belong to experiment ${fake.EXPERIMENT_ID}.`));

    expect(signedUrlSpy).not.toHaveBeenCalled();
  });

  it('Not existent results throws a 500', async () => {
    mockS3GetObjectTagging({});

    await expect(getWorkResults(fake.EXPERIMENT_ID, 'mockETag'))
      .rejects.toThrow(new InternalServerError('S3 work results key mockETag has no tags'));
  });
});
