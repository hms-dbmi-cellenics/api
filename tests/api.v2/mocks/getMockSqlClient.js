// @ts-nocheck
const _ = require('lodash');

module.exports = () => {
  const queries = {
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    raw: jest.fn(),
    returning: jest.fn(),
  };

  const queriesInTrx = _.cloneDeep(queries);
  const mockTrx = jest.fn(() => queriesInTrx);
  mockTrx.commit = jest.fn().mockReturnThis();
  mockTrx.rollback = jest.fn().mockReturnThis();
  _.merge(mockTrx, queriesInTrx);

  const queriesInSqlClient = _.cloneDeep(queries);
  const mockSqlClient = {
    transaction: jest.fn(() => Promise.resolve(mockTrx)),
    ...queriesInSqlClient,
  };

  return { mockSqlClient, mockTrx };
};
