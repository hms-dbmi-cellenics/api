// @ts-nocheck
const config = require('../../src/config');
const getConnectionParams = require('../../src/sql/getConnectionParams');

const knexfile = require('../../src/sql/knexfile');

jest.mock('../../src/config');

const mockConnectionParams = { fake: true };
jest.mock('../../src/sql/getConnectionParams', () => jest.fn(() => mockConnectionParams));

describe('knexfile', () => {
  it('Works correctly for staging', async () => {
    config.clusterEnv = 'staging';

    const res = await knexfile();

    expect(res.staging).toBeTruthy();
    expect(res.staging.connection).toBeTruthy();
    expect(res).toMatchSnapshot();

    const connectionParams = await res.staging.connection();
    expect(connectionParams).toEqual(mockConnectionParams);

    expect(getConnectionParams).toHaveBeenCalled();
  });
});

describe('postProcessResponse', () => {
  let postProcessResponse;

  beforeEach(async () => {
    jest.clearAllMocks();

    config.clusterEnv = 'staging';
    const res = await knexfile();
    postProcessResponse = res.staging.postProcessResponse;
  });

  it('Doesn\'t affect arrays', async () => {
    const anArray = ['item_1', 'item_2', 'item_3', 'item_4'];

    expect(postProcessResponse(anArray)).toEqual(anArray);
  });

  it('Works correctly for shallow objects', () => {
    const aShallowObject = {
      key_one: 'one_one',
      key_two: 'another one',
      key_three: 'yep',
      key4last_one: 'nope',
    };

    const result = {
      keyOne: 'one_one',
      keyTwo: 'another one',
      keyThree: 'yep',
      key4LastOne: 'nope',
    };

    expect(postProcessResponse(aShallowObject)).toEqual(result);
  });

  it('Works correctly for deep objects', () => {
    const aShallowObject = {
      key_one: 'one_one',
      key_two: 'another one',
      key_array: ['item_1', 'item_2', 'item_3', 'item_4'],
      key_three: 'yep',
      key_nested_things: {
        nested_key1: 'one',
        nested_key2_two: 'two',
        nested_key_three: 'two',
      },
      key4last_one: 'nope',
    };

    const result = {
      keyOne: 'one_one',
      keyTwo: 'another one',
      keyArray: ['item_1', 'item_2', 'item_3', 'item_4'],
      keyThree: 'yep',
      keyNestedThings: {
        nestedKey1: 'one',
        nestedKey2Two: 'two',
        nestedKeyThree: 'two',
      },
      key4LastOne: 'nope',
    };

    expect(postProcessResponse(aShallowObject)).toEqual(result);
  });
});
