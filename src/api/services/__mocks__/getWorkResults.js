const { UnauthorizedError, NotFoundError } = require('../../../utils/responses');

const mockGetWorkResults = jest.fn((experimentId) => new Promise((resolve, reject) => {
  const response = {
    signedUrl: 'https://apiurl:port/blabla/asd/asd',
  };
  if (experimentId === 'unauthorizedExperimentId') {
    const err = new UnauthorizedError('User does not have permissions to get worker results for this experiment');
    reject(err);
  } else if (experimentId === 'nonExistentId') {
    const err = new NotFoundError('Worker results not found');
    reject(err);
  }

  resolve(response);
}));

module.exports = mockGetWorkResults;
