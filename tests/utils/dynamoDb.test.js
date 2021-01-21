const { configArrayToUpdateObjs } = require('../../src/utils/dynamoDb');

describe('tests for DynamoDB functions', () => {
  it('configArrayToUpdateObjs converts configArrray properly', () => {
    const input = [
      {
        name: 'conf1',
        body: {
          opt1: true,
          opt2: 1234,
        },
      },
      {
        name: 'conf2',
        body: {
          opt1: {
            subopt1: 'abcd',
            subopt2: 1234,
          },
        },
      },
    ];

    const output = {
      updExpr: 'SET test.#key1 = :val1, test.#key2 = :val2',
      attrNames: {
        '#key1': 'conf1',
        '#key2': 'conf2',
      },
      attrValues: {
        ':val1': {
          M: {
            opt1: { BOOL: true },
            opt2: { N: '1234' },
          },
        },
        ':val2': {
          M: {
            opt1: {
              M: {
                subopt1: { S: 'abcd' },
                subopt2: { N: '1234' },
              },
            },
          },
        },
      },
    };

    const result = configArrayToUpdateObjs('test', input);

    expect(result).toEqual(output);
  });
});
