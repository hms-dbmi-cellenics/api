const stub = {
  create: jest.fn(),
  findAll: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
};

const BasicModel = jest.fn().mockImplementation(() => stub);

module.exports = BasicModel;
