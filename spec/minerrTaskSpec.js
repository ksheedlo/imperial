'use strict';

/*global describe, it, expect*/

var minerr = require('../minerrparse.js');

describe('The MinErr transformer', function () {
  
  it('should strip error messages from calls to MinErr instances', function () {
    var ast = {
      type: 'CallExpression',
      callee: {
        type: 'Identifier',
        name: 'fooMinErr'
      },
      arguments: [
        {
          type: 'Literal',
          value: 'test1'
        },
        {
          type: 'Literal',
          value: 'test {0}'
        },
        {
          type: 'Literal',
          value: 'foobaz'
        }
      ]
    };
    var expected = {
      type: 'CallExpression',
      callee: {
        type: 'Identifier',
        name: 'fooMinErr'
      },
      arguments: [
        {
          type: 'Literal',
          value: 'test1'
        },
        {
          type: 'Literal',
          value: 'foobaz'
        }
      ]
    };
    expect(minerr(ast)).toEqual(expected);
  });

  it('should strip error messages from curried calls to minErr', function () {
    var ast = {
      type: 'CallExpression',
      callee: {
        type: 'CallExpression',
        callee: {
          type: 'Identifier',
          name: 'minErr'
        }
      },
      arguments: [
        {
          type: 'Literal',
          value: 'test1'
        },
        {
          type: 'Literal',
          value: 'test {0}'
        },
        {
          type: 'Literal',
          value: 'foobaz'
        }
      ]
    };
    var expected = {
      type: 'CallExpression',
      callee: {
        type: 'CallExpression',
        callee: {
          type: 'Identifier',
          name: 'minErr'
        }
      },
      arguments: [
        {
          type: 'Literal',
          value: 'test1'
        },
        {
          type: 'Literal',
          value: 'foobaz'
        }
      ]
    };
    expect(minerr(ast)).toEqual(expected);
  });
});
