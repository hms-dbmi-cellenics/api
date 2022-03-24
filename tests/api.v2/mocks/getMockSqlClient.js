// @ts-nocheck
const _ = require('lodash');

module.exports = () => {
  const queryBuilder = {
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    raw: jest.fn(),
    returning: jest.fn(),
  };

  const mockTrx = jest.fn(() => queryBuilder);
  mockTrx.commit = jest.fn().mockReturnThis();
  mockTrx.rollback = jest.fn().mockReturnThis();

  _.merge(mockTrx, queryBuilder);

  const mockSqlClient = {
    transaction: jest.fn(() => Promise.resolve(mockTrx)),
    ...(_.cloneDeep(queryBuilder)),
  };

  return { mockSqlClient, mockTrx };
};
