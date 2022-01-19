const AWSMock = require('aws-sdk-mock');
const getWorkResults = require('../../../src/api/general-services/get-work-results');
const { mockS3GetObjectTagging, mockS3GetSignedUrl } = require('../../test-utils/mockAWSServices');

const tags = { TagSet: [{ Key: 'experimentId', Value: 'mockExperimentIdsd41dvc3' }, { Key: 'otherTag', Value: 'mockOtherTag' }] };

describe('Get worker results signed url', () => {
  beforeEach(() => {
    AWSMock.restore();
    jest.clearAllMocks();
  });

  it('Correct experiment Id should get a signed url', async () => {
    const s3Spy = mockS3GetObjectTagging(tags);
    const signedUrlSpy = mockS3GetSignedUrl();

    await getWorkResults('mockExperimentIdsd41dvc3', 'mockETag');
    expect(s3Spy).toHaveBeenCalled();
    expect(signedUrlSpy).toHaveBeenCalledWith('getObject', { Bucket: 'worker-results-test', Key: 'mockETag' });
  });

  it('Incorrect experiment ID does not get a signed URL', async () => {
    mockS3GetObjectTagging(tags);
    const signedUrlSpy = mockS3GetSignedUrl();

    await expect(
      getWorkResults('someOtherExpIdasdasd', 'mockETag'),
    ).rejects.toThrow('User is not authorized to get worker results for this experiment');

    expect(signedUrlSpy).not.toHaveBeenCalled();
  });
  it('Not existent results throws 404', () => {
    mockS3GetObjectTagging({});

    return expect(
      getWorkResults('mockExperimentIdsd41dvc3', 'mockETag'),
    ).rejects.toThrow('Worker results not found');
  });
});
