const knex = require('knex');

const sqlClient = require('../../src/sql/sqlClient');

const mockKnexInstance = jest.fn();
jest.mock('knex', () => ({
  default: jest.fn(() => mockKnexInstance),
}));

describe('sqlClient', () => {
  it('Works correctly', () => {
    const mockedConfig = 'mockedConfig';

    // First time it's called
    const instance = sqlClient.get(mockedConfig);

    // It uses the config it receives
    expect(instance).toEqual(mockKnexInstance);
    expect(knex.default).toHaveBeenCalledWith(mockedConfig);
    expect(knex.default).toHaveBeenCalledTimes(1);

    // Next time it doesn't need it anymore
    const secondInstance = sqlClient.get();

    // It returns the same instance it got the first time
    expect(secondInstance).toEqual(mockKnexInstance);

    // knex client isn't started again
    expect(knex.default).toHaveBeenCalledTimes(1);
  });
});
