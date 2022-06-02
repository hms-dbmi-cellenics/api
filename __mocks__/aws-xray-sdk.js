const mockAWSXray = jest.genMockFromModule('aws-xray-sdk');

mockAWSXray.express.openSegment = () => (req, res, next) => {
  next();
};

const mockSegment = {
  addMetadata: () => null,
  addAnnotation: () => null,
  addError: () => null,
  close: () => null,
};

const mockGetNamespace = {
  runPromise: async (func) => await func(),
};
mockAWSXray.getNamespace = () => mockGetNamespace;
mockAWSXray.getSegment = () => mockSegment;
mockAWSXray.captureAsyncFunc = (name, fn) => {
  fn(mockSegment);
};

mockAWSXray.express.closeSegment = () => (err, req, res, next) => {
  if (next) { next(err); }
};

module.exports = mockAWSXray;
