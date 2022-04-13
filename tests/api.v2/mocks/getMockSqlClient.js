// @ts-nocheck
const _ = require('lodash');

module.exports = () => {
  const queries = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    first: jest.fn().mockReturnThis(),
    raw: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    as: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    timeout: jest.fn().mockReturnThis(),
  };

  const queriesInTrx = _.cloneDeep(queries);
  const mockTrx = jest.fn(() => queriesInTrx);
  mockTrx.commit = jest.fn().mockReturnThis();
  mockTrx.rollback = jest.fn().mockReturnThis();
  _.merge(mockTrx, queriesInTrx);

  const queriesInSqlClient = _.cloneDeep(queries);

  const mockSqlClient = jest.fn(() => queriesInSqlClient);
  _.merge(mockSqlClient, {
    transaction: jest.fn((param) => {
      if (!param || !(param instanceof Function)) {
        return mockTrx;
      }

      // Received a function to run within the transaction
      return param(mockTrx);
    }),
    ...queriesInSqlClient,
  });

  return { mockSqlClient, mockTrx };
};
