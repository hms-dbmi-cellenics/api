const stub = {
  register: jest.fn(),
  registerAll: jest.fn(),
  run: jest.fn(),
};

const HookRunner = jest.fn().mockImplementation(() => stub);

module.exports = HookRunner;
