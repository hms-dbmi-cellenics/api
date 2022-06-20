const mockLogger = {
  log: jest.fn(() => { }),
  error: jest.fn(() => { }),
  debug: jest.fn(() => { }),
  trace: jest.fn(() => { }),
  warn: jest.fn(() => { }),
};

module.exports = jest.fn(() => mockLogger);
