const mockAWSXray = jest.genMockFromModule('aws-xray-sdk');

mockAWSXray.express.openSegment = () => (req, res, next) => {
  next();
};

mockAWSXray.express.closeSegment = () => (err, req, res, next) => {
  if (next) { next(err); }
};

module.exports = mockAWSXray;
