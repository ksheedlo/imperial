'use strict';

/*global toString*/

module.exports = (function () {
  var deepCopy, isASTArray, isAST, isMinErr, transform, transformHandlers;

  deepCopy = function (obj) {
    return JSON.parse(JSON.stringify(obj));
  };

  isAST = function (obj) {
    return typeof(obj) === 'object' && obj.type !== undefined;
  };

  isASTArray = function (value) {
    if (toString.apply(value) === '[object Array]') {
      return value.every(isAST);
    }
    return false;
  };

  isMinErr = function (ast) {
    // MinErr instance must be a call expression.
    // throw minErr([module])(code, template, ...)
    // throw moduleMinErr(code, template, ...)
    if (ast.type !== 'CallExpression') {
      return false;
    }
    if (ast.callee.type === 'Identifier' && ast.callee.name.match(/^.+MinErr$/)) {
      return true;
    }
    if (ast.callee.type === 'CallExpression') {
      if (ast.callee.callee.type === 'Identifier' && ast.callee.callee.name === 'minErr') {
        return true;
      }
    }
    return false;
  };

  transformHandlers = {
    ThrowStatement: function (ast) {
      var copyAST = deepCopy(ast);
      if (!isMinErr(ast.argument)) {
        console.log('[WARN] Throwing an error that is not a MinErr instance');
      }
      copyAST.argument = transform(ast.argument);
      return copyAST;
    },
    CallExpression: function (ast) {
      // If this is a MinErr instance, delete the template string.
      var copyAST = deepCopy(ast);
      if (isMinErr(ast)) {
        copyAST.arguments = Array.prototype.concat([], ast.arguments[0], ast.arguments.slice(2));
      }
      return copyAST;
    },
  };

  transform = function (ast) {
    var copyAST = deepCopy(ast);
    if (transformHandlers[ast.type]) {
      return transformHandlers[ast.type](ast);
    }
    for (var key in ast) {
      if (isAST(ast[key])) {
        copyAST[key] = transform(ast[key]);
      }
      if (isASTArray(ast[key])) {
        copyAST[key] = ast[key].map(transform);
      }
    }
    return copyAST;
  };

  return transform;
})();
