'use strict';

/*global beforeEach, describe, expect, it, jasmine, minErr*/

var esprima = require('esprima');
var minerr = require('../minerrparse.js');

describe('The MinErr parser', function () {

  var parse, logger, toAST;

  toAST = function (code) {
    // Converts a function into an AST using Esprima.
    return esprima.parse('(' + code.toString() + ')');
  };

  beforeEach(function () {
    logger = jasmine.createSpyObj('logger', ['error']);
    parse = minerr({ logger: logger });

    this.addMatchers({
      toTransformTo: function (expected) {
        var actualAST = parse(toAST(this.actual)).ast,
          expectedAST = toAST(expected);
        return JSON.stringify(actualAST) === JSON.stringify(expectedAST);
      },
      toExtract: function (expected) {
        var actualErr = parse(toAST(this.actual)).error;
        return JSON.stringify(actualErr) === JSON.stringify(expected);
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
    expect(parse(ast).ast).toEqual(expected);
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
    expect(parse(ast).ast).toEqual(expected);
  });

  it('should remove the descriptive name', function () {
    expect(function(testMinErr, test) {
      testMinErr('test1', 'This is a {0}', test);
    }).toTransformTo(function (testMinErr, test) {
      testMinErr('test1', test);
    });
  });

  it('should extract error info', function () {
    expect(function(testMinErr, test) {
      testMinErr('test1', 'This is a {0}', test);
    }).toExtract({ 'test1': 'This is a {0}' });
  });

  it('should extract multiple error messages', function () {
    expect(function(testMinErr, test) {
      testMinErr('test1', 'This is a {0}', test);
      minErr('test')('test2', 'The answer is {0}', 42);
    }).toExtract({ 'test1': 'This is a {0}', 'test2': 'The answer is {0}' });
  });

  it('should warn when it finds an error that is not a MinErr', function () {
    var ast = toAST(function () {
        throw new Error('Oops!');
      });
    parse(ast);
    expect(logger.error).toHaveBeenCalledWith('Throwing an error that is not a MinErr instance');
  });

  it('should not modify functions that don\'t use MinErr', function () {
    expect(function (foo, baz) {
      for (var i = 0; i < baz; i++) {
        console.log('Hi there!');
      }
      return 42 - foo;
    }).toTransformTo(function (foo, baz) {
      for (var i = 0; i < baz; i++) {
        console.log('Hi there!');
      }
      return 42 - foo;
    });
  });

  it('should not modify functions that use MinErr but do not call it', function () {
    expect(function () {
      var fooMinErr = minErr('foo');
      return fooMinErr;
    }).toTransformTo(function () {
      var fooMinErr = minErr('foo');
      return fooMinErr;
    });
  });
});
