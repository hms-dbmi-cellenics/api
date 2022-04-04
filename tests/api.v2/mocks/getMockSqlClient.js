// @ts-nocheck
const _ = require('lodash');

module.exports = () => {
  const queries = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    first: jest.fn().mockReturnThis(),
    raw: jest.fn(),
    returning: jest.fn(),
    join: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    as: jest.fn().mockReturnThis(),
  };

  const queriesInTrx = _.cloneDeep(queries);
  const mockTrx = jest.fn(() => queriesInTrx);
  mockTrx.commit = jest.fn().mockReturnThis();
  mockTrx.rollback = jest.fn().mockReturnThis();
  _.merge(mockTrx, queriesInTrx);

  const queriesInSqlClient = _.cloneDeep(queries);

  const mockSqlClient = jest.fn(() => queriesInSqlClient);
  _.merge(mockSqlClient, {
    transaction: jest.fn(() => Promise.resolve(mockTrx)),
    ...queriesInSqlClient,
  });

  return { mockSqlClient, mockTrx };
};
