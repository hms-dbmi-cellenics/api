// @ts-nocheck
const { batchConvertToDynamoUpdateParams, convertToDynamoUpdateParams } = require('../../src/utils/dynamoDb');

describe('convertToDynamoUpdateParams', () => {
  it('calls aws correctly', () => {
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

    const result = convertToDynamoUpdateParams('test', input);

    expect(result).toEqual(output);
  });
});

describe('batchConvertToDynamoUpdateParams', () => {
  it('works correctly', () => {
    const input = [
      ['meta'],
      {
        meta: [
          {
            name: 'pipeline',
            body: {
              stateMachineArn: 'arn:aws:states:eu-west-1:000000000000:stateMachine:biomage-qc-development-stuff',
              executionArn: 'arn:aws:states:eu-west-1:000000000000:execution:biomage-qc-development-stuff',
            },
          }, {
            name: 'gem2s',
            body: {
              paramsHash: 'hash',
              stateMachineArn: 'arn:aws:states:eu-west-1:000000000000:stateMachine:biomage-gem2s-development-stuff',
              executionArn: 'arn:aws:states:eu-west-1:000000000000:execution:biomage-gem2s-development-stuff',
            },
          }, { name: 'organism', body: null }, { name: 'type', body: '10x' }],
      },
    ];

    const output = {
      updateExpressionList: [' meta.#key1 = :val1, meta.#key2 = :val2, meta.#key3 = :val3, meta.#key4 = :val4'],
      attributeNames: {
        '#key1': 'pipeline', '#key2': 'gem2s', '#key3': 'organism', '#key4': 'type',
      },
      attributeValues: {
        ':val1': {
          M: {
            stateMachineArn: { S: 'arn:aws:states:eu-west-1:000000000000:stateMachine:biomage-qc-development-stuff' },
            executionArn: { S: 'arn:aws:states:eu-west-1:000000000000:execution:biomage-qc-development-stuff' },
          },
        },
        ':val2': {
          M: {
            paramsHash: { S: 'hash' },
            stateMachineArn: { S: 'arn:aws:states:eu-west-1:000000000000:stateMachine:biomage-gem2s-development-stuff' },
            executionArn: { S: 'arn:aws:states:eu-west-1:000000000000:execution:biomage-gem2s-development-stuff' },
          },
        },
        ':val3': { NULL: true },
        ':val4': { S: '10x' },
      },
    };

    const result = batchConvertToDynamoUpdateParams(...input);

    expect(result).toEqual(output);
  });
});
