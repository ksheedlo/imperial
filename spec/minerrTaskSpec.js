'use strict';

/*global beforeEach, describe, expect, it, jasmine*/

var esprima = require('esprima');
var minerr = require('../minerrparse.js');

describe('The MinErr parser', function () {

  var parser, loggerMock;

  beforeEach(function () {
    loggerMock = {
      error: jasmine.createSpy()
    };
    parser = minerr({ logger: loggerMock });

    this.addMatchers({
      toTransformTo: function (expected) {
        var actualAST = parser.transform(esprima.parse('(' + this.actual.toString() + ')')),
          expectedAST = esprima.parse('(' + expected.toString() + ')');
        return JSON.stringify(actualAST) === JSON.stringify(expectedAST);
      },
      toExtract: function () {
        return false;
      }
    });
  });
  
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
    expect(parser.transform(ast)).toEqual(expected);
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
    expect(parser.transform(ast)).toEqual(expected);
  });

  it('should remove the descriptive name', function () {
    expect(function(testMinErr, test) {
      testMinErr('test1', 'This is a {0}', test);
    }).toTransformTo(function (testMinErr, test) {
      testMinErr('test1', test);
    });
  });
});
