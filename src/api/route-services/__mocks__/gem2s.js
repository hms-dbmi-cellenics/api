const mockGem2sCreate = jest.fn(() => Promise.resolve({
  stateMachineArn: 'arn:aws:states:eu-east-1:3139055674710:stateMachine:biomage-gem2s-production-2367819df529419d7c95167336f5d6ae681859b2',
  executionArn: 'arn:aws:states:eu-east-1:3139055674710:execution:biomage-gem2s-production-2367819df529419d7c95167336f5d6ae681859b2:90b4bc06-507e-41e3-ae0b-fc9cc83cnm3f',
}));

const mockGem2sResponse = jest.fn(() => Promise.resolve({}));

const mockGenerateGem2sParams = jest.fn(() => {});

const mock = jest.fn().mockImplementation(() => ({
  gem2sCreate: mockGem2sCreate,
  gem2sResponse: mockGem2sResponse,
  generateGem2sParams: mockGenerateGem2sParams,
}));

module.exports = mock;
