const stub = {
  create: jest.fn(),
  findAll: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  upsert: jest.fn(),
  update: jest.fn(),
  updateById: jest.fn(),
  delete: jest.fn(),
  deleteById: jest.fn(),
};

const BasicModel = jest.fn().mockImplementation(() => stub);

module.exports = BasicModel;
